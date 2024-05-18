import {
	createTheme,
	type CSSVariablesResolver,
	rem,
	Button,
	Textarea,
	SegmentedControl,
	Combobox,
	ComboboxOption,
	ActionIcon,
	Input,
	PasswordInput,
	NumberInput,
	type ButtonCssVariables,
	type PartialTransformVars,
	MultiSelect,
	Select,
	Drawer,
	Modal,
	CloseButton,
	Checkbox,
	Radio,
	Badge,
	Paper,
	TabsTab,
	PinInput,
	Tooltip,
	Menu,
} from "@mantine/core";
import classes from "./theme.module.css";

export const theme = createTheme({
	defaultRadius: "xl",
	focusClassName: classes.focus,
	radius: {
		xs: rem(4),
		sm: rem(8),
		md: rem(12),
		lg: rem(16),
		xl: rem(20),
	},
	lineHeights: {
		xs: "calc(16px * var(--mantine-scale))",
		sm: "calc(20px * var(--mantine-scale))",
		md: "calc(24px * var(--mantine-scale))",
		lg: "calc(26px * var(--mantine-scale))",
		xl: "calc(28px * var(--mantine-scale))",
	},
	primaryColor: "cyan",
	primaryShade: 4,
	autoContrast: true,
	cursorType: "pointer",
	activeClassName: classes.active,
	components: {
		ActionIcon: ActionIcon.extend({
			defaultProps: {
				radius: "xl",
			},
		}),
		Input: Input.extend({
			defaultProps: {
				classNames: {
					input: classes.input,
				},
				leftSectionProps: {
					className: classes.section,
				},
				rightSectionProps: {
					className: classes.section,
				},
			},
		}),
		PasswordInput: PasswordInput.extend({
			defaultProps: {
				classNames: {
					input: classes.input,
				},
			},
		}),
		NumberInput: NumberInput.extend({
			defaultProps: {
				classNames: {
					input: classes.input,
					controls: classes.controls,
				},
			},
		}),
		PinInput: PinInput.extend({
			defaultProps: {
				classNames: {
					input: classes.input,
				},
			},
		}),
		Button: Button.extend({
			vars: () =>
				({
					root: {
						"--button-height-xs": rem(24),
						"--button-height-sm": rem(32),
						"--button-height-md": rem(40),
						"--button-height-lg": rem(48),
						"--button-height-xl": rem(56),
						"--button-padding-x-xs": rem(8),
						"--button-padding-x-sm": rem(12),
						"--button-padding-x-md": rem(16),
						"--button-padding-x-lg": rem(24),
						"--button-padding-x-xl": rem(32),
						"--button-fz": rem(13),
					},
				}) as PartialTransformVars<ButtonCssVariables>,
			defaultProps: {
				radius: "xl",
				classNames: {
					root: classes.button,
				},
				fw: "normal",
			},
		}),
		Textarea: Textarea.extend({
			defaultProps: {
				radius: "md",
				minRows: 3,
			},
		}),
		SegmentedControl: SegmentedControl.extend({
			defaultProps: {
				radius: "sm",
			},
		}),
		Combobox: Combobox.extend({
			defaultProps: {
				shadow: "md",
			},
		}),
		ComboboxOption: ComboboxOption.extend({
			defaultProps: {
				classNames: {
					option: classes.option,
				},
			},
		}),
		MultiSelect: MultiSelect.extend({
			defaultProps: {
				classNames: {
					input: classes.input,
				},
			},
		}),
		Select: Select.extend({
			defaultProps: {
				classNames: {
					input: classes.input,
				},
			},
		}),
		CloseButton: CloseButton.extend({
			defaultProps: { radius: "xl" },
		}),
		Paper: Paper.extend({
			defaultProps: {
				classNames: {
					root: classes.paper,
				},
			},
		}),
		Drawer: Drawer.extend({
			defaultProps: {
				classNames: {
					header: classes.drawerHeader,
					content: classes.drawer,
				},
				position: "right",
				size: "xl",
				closeButtonProps: {
					size: "lg",
					className: classes.closeButton,
				},
			},
		}),
		Modal: Modal.extend({
			defaultProps: {
				classNames: {
					header: classes.modalHeader,
				},
				closeButtonProps: {
					size: "sm",
					className: classes.closeButton,
				},
			},
		}),
		Radio: Radio.extend({
			defaultProps: {
				variant: "outline",
			},
		}),
		Checkbox: Checkbox.extend({
			defaultProps: {
				radius: "xs",
				variant: "filled",
			},
		}),
		TabsTab: TabsTab.extend({
			defaultProps: {
				classNames: {
					tab: classes.tab,
				},
			},
		}),
		Badge: Badge.extend({
			defaultProps: {
				radius: "xs",
				size: "sm",
			},
		}),
		Tooltip: Tooltip.extend({
			defaultProps: {
				radius: "sm",
				withArrow: true,
			},
		}),
		Menu: Menu.extend({
			defaultProps: {
				radius: "sm",
			},
		}),
	},
});

export const resolver: CSSVariablesResolver = (theme) => ({
	variables: {},
	light: {},
	dark: {},
});
