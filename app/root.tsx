import { useForm, getFormProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { invariantResponse } from "@epic-web/invariant";
import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	type HeadersFunction,
	type LinksFunction,
	type MetaFunction,
} from "@remix-run/node";
import {
	Form,
	Link,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useFetcher,
	useFetchers,
	useLoaderData,
	useMatches,
	useSubmit,
} from "@remix-run/react";
import { withSentry } from "@sentry/remix";
import { useRef } from "react";
import { HoneypotProvider } from "remix-utils/honeypot/react";
import { z } from "zod";
import { GeneralErrorBoundary } from "./components/error-boundary.tsx";
import { EpicProgress } from "./components/progress-bar.tsx";
import { SearchBar } from "./components/search-bar.tsx";
import { useToast } from "./components/toaster.tsx";
import "@mantine/core/styles.css";
import tailwindStyleSheetUrl from "./styles/tailwind.css?url";
import { getUserId, logout } from "./utils/auth.server.ts";
import { ClientHintCheck, getHints, useHints } from "./utils/client-hints.tsx";
import { prisma } from "./utils/db.server.ts";
import { getEnv } from "./utils/env.server.ts";
import { honeypot } from "./utils/honeypot.server.ts";
import { combineHeaders, getDomainUrl, getUserImgSrc } from "./utils/misc.tsx";
import { useNonce } from "./utils/nonce-provider.ts";
import { useRequestInfo } from "./utils/request-info.ts";
import { makeTimings, time } from "./utils/timing.server.ts";
import { getToast } from "./utils/toast.server.ts";
import { useOptionalUser, useUser } from "./utils/user.ts";
import {
	Button,
	ActionIcon,
	Flex,
	Menu,
	MantineProvider,
	ColorSchemeScript,
	Container,
	useMantineColorScheme,
	useComputedColorScheme,
} from "@mantine/core";
import {
	Pencil2Icon,
	AvatarIcon,
	ExitIcon,
	SunIcon,
	MoonIcon,
	LaptopIcon,
} from "@radix-ui/react-icons";
import { EpicToaster } from "./components/ui/sonner.tsx";
import { resolver, theme as mantineTheme } from "./theme/theme.ts";

export const links: LinksFunction = () => {
	return [
		// Preload CSS as a resource to avoid render blocking
		{ rel: "mask-icon", href: "/favicons/mask-icon.svg" },
		{
			rel: "alternate icon",
			type: "image/png",
			href: "/favicons/favicon-32x32.png",
		},
		{ rel: "apple-touch-icon", href: "/favicons/apple-touch-icon.png" },
		{
			rel: "manifest",
			href: "/site.webmanifest",
			crossOrigin: "use-credentials",
		} as const, // necessary to make typescript happy
		//These should match the css preloads above to avoid css as render blocking resource
		{ rel: "icon", type: "image/svg+xml", href: "/favicons/favicon.svg" },
		{ rel: "stylesheet", href: tailwindStyleSheetUrl },
	].filter(Boolean);
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	return [
		{ title: data ? "Epic Notes" : "Error | Epic Notes" },
		{ name: "description", content: `Your own captain's log` },
	];
};

export async function loader({ request }: LoaderFunctionArgs) {
	const timings = makeTimings("root loader");
	const userId = await time(() => getUserId(request), {
		timings,
		type: "getUserId",
		desc: "getUserId in root",
	});

	const user = userId
		? await time(
				() =>
					prisma.user.findUniqueOrThrow({
						select: {
							id: true,
							name: true,
							username: true,
							image: { select: { id: true } },
							roles: {
								select: {
									name: true,
									permissions: {
										select: { entity: true, action: true, access: true },
									},
								},
							},
						},
						where: { id: userId },
					}),
				{ timings, type: "find user", desc: "find user in root" },
			)
		: null;
	if (userId && !user) {
		console.info("something weird happened");
		// something weird happened... The user is authenticated but we can't find
		// them in the database. Maybe they were deleted? Let's log them out.
		await logout({ request, redirectTo: "/" });
	}
	const { toast, headers: toastHeaders } = await getToast(request);
	const honeyProps = honeypot.getInputProps();

	return json(
		{
			user,
			requestInfo: {
				hints: getHints(request),
				origin: getDomainUrl(request),
				path: new URL(request.url).pathname,
			},
			ENV: getEnv(),
			toast,
			honeyProps,
		},
		{
			headers: combineHeaders(
				{ "Server-Timing": timings.toString() },
				toastHeaders,
			),
		},
	);
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
	const headers = {
		"Server-Timing": loaderHeaders.get("Server-Timing") ?? "",
	};
	return headers;
};

function Document({
	children,
	nonce,
	env = {},
	allowIndexing = true,
}: {
	children: React.ReactNode;
	nonce: string;
	env?: Record<string, string>;
	allowIndexing?: boolean;
}) {
	return (
		<html lang="en">
			<head>
				<ClientHintCheck nonce={nonce} />
				<Meta />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				{allowIndexing ? null : (
					<meta name="robots" content="noindex, nofollow" />
				)}
				<Links />
				<ColorSchemeScript nonce={nonce} defaultColorScheme="auto" />
			</head>
			<body>
				<MantineProvider
					theme={mantineTheme}
					cssVariablesResolver={resolver}
					defaultColorScheme="auto"
				>
					{children}
				</MantineProvider>
				<script
					nonce={nonce}
					// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(env)}`,
					}}
				/>
				<ScrollRestoration nonce={nonce} />
				<Scripts nonce={nonce} />
			</body>
		</html>
	);
}

function App() {
	const data = useLoaderData<typeof loader>();
	const nonce = useNonce();
	const user = useOptionalUser();
	const matches = useMatches();
	const isOnSearchPage = matches.find((m) => m.id === "routes/users+/index");
	const searchBar = isOnSearchPage ? null : <SearchBar status="idle" />;
	const allowIndexing = data.ENV.ALLOW_INDEXING !== "false";
	useToast(data.toast);

	return (
		<Document nonce={nonce} allowIndexing={allowIndexing} env={data.ENV}>
			<Flex h="100vh" direction="column" justify="space-between">
				<Container size="xl" component="header" py="xs" w="100%">
					<Flex
						component="nav"
						wrap={{ base: "wrap", sm: "nowrap" }}
						align="center"
						justify="space-between"
						gap={{
							base: "md",
							md: "lg",
						}}
					>
						<Logo />
						<Flex gap="sm">
							<div className="ml-auto hidden max-w-sm flex-1 sm:block">
								{searchBar}
							</div>
							<Flex align="center">
								{user ? (
									<UserDropdown />
								) : (
									<Button component={Link} to="/login">
										Log In
									</Button>
								)}
							</Flex>
						</Flex>
						<div className="block w-full sm:hidden">{searchBar}</div>
					</Flex>
				</Container>

				<div className="flex-1">
					<Outlet />
				</div>

				<Container size="xl" w="100%" pb="md">
					<Flex gap="lg" justify="space-between" align="center">
						<Logo />
						<ThemeSwitch />
					</Flex>
				</Container>
			</Flex>
			<EpicToaster closeButton position="top-center" />
			<EpicProgress />
		</Document>
	);
}

function Logo() {
	return (
		<Link to="/" className="group grid leading-snug">
			<span className="font-light transition group-hover:-translate-x-1">
				epic
			</span>
			<span className="font-bold transition group-hover:translate-x-1">
				notes
			</span>
		</Link>
	);
}

function AppWithProviders() {
	const data = useLoaderData<typeof loader>();
	return (
		<HoneypotProvider {...data.honeyProps}>
			<App />
		</HoneypotProvider>
	);
}

export default withSentry(AppWithProviders);

function UserDropdown() {
	const user = useUser();
	const submit = useSubmit();
	const formRef = useRef<HTMLFormElement>(null);
	return (
		<Menu>
			<Menu.Target>
				<Button
					component={Link}
					variant="soft"
					to={`/users/${user.username}`}
					// this is for progressive enhancement
					onClick={(e) => e.preventDefault()}
					className="flex items-center gap-2"
				>
					<img
						className="h-8 w-8 rounded-full object-cover"
						alt={user.name ?? user.username}
						src={getUserImgSrc(user.image?.id)}
					/>
					<span className="text-body-sm font-bold">
						{user.name ?? user.username}
					</span>
				</Button>
			</Menu.Target>

			<Menu.Dropdown>
				<Menu.Item
					component={Link}
					prefetch="intent"
					to={`/users/${user.username}`}
					leftSection={<AvatarIcon />}
				>
					Profile
				</Menu.Item>
				<Menu.Item
					component={Link}
					prefetch="intent"
					to={`/users/${user.username}/notes`}
					leftSection={<Pencil2Icon />}
				>
					Notes
				</Menu.Item>
				<Menu.Item
					component={Form}
					// this prevents the menu from closing before the form submission is completed
					onSelect={(event) => {
						event.preventDefault();
						submit(formRef.current);
					}}
					leftSection={<ExitIcon />}
					action="/logout"
					method="POST"
					ref={formRef}
				>
					<button type="submit">Logout</button>
				</Menu.Item>
			</Menu.Dropdown>
		</Menu>
	);
}

/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
export function useOptimisticThemeMode() {
	const fetchers = useFetchers();
	const themeFetcher = fetchers.find((f) => f.formAction === "/");

	if (themeFetcher?.formData) {
		const submission = parseWithZod(themeFetcher.formData, {
			schema: ThemeFormSchema,
		});

		if (submission.status === "success") {
			return submission.value.theme;
		}
	}
}

function ThemeSwitch() {
	// -> colorScheme is 'auto' | 'light' | 'dark'
	const { colorScheme, setColorScheme } = useMantineColorScheme();

	// -> computedColorScheme is 'light' | 'dark', argument is the default value
	const computedColorScheme = useComputedColorScheme("light");

	// Incorrect color scheme toggle implementation
	// If colorScheme is 'auto', then it is not possible to
	// change color scheme correctly in all cases:
	// 'auto' can mean both light and dark
	const toggleColorScheme = () => {
		setColorScheme(colorScheme === "dark" ? "light" : "dark");
	};

	const modeLabel = {
		light: <SunIcon />,
		dark: <MoonIcon />,
	};

	return (
		<ActionIcon onClick={toggleColorScheme} variant="soft">
			{modeLabel[computedColorScheme]}
		</ActionIcon>
	);
}

export function ErrorBoundary() {
	// the nonce doesn't rely on the loader so we can access that
	const nonce = useNonce();

	// NOTE: you cannot use useLoaderData in an ErrorBoundary because the loader
	// likely failed to run so we have to do the best we can.
	// We could probably do better than this (it's possible the loader did run).
	// This would require a change in Remix.

	// Just make sure your root route never errors out and you'll always be able
	// to give the user a better UX.

	return (
		<Document nonce={nonce}>
			<GeneralErrorBoundary />
		</Document>
	);
}
