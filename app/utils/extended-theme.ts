import type { Config } from "tailwindcss";

export const extendedTheme = {
	keyframes: {
		"caret-blink": {
			"0%,70%,100%": { opacity: "1" },
			"20%,50%": { opacity: "0" },
		},
	},
	animation: {
		"caret-blink": "caret-blink 1.25s ease-out infinite",
	},
} satisfies Config["theme"];
