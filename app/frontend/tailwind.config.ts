import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
		"./index.html",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				pitchiq: {
					red: '#E63946',
					navy: '#001f3f',
					purple: '#9b87f5',
					'purple-dark': '#7E69AB',
					'purple-light': '#D6BCFA',
					'green-light': '#F2FCE2',
					'gray-light': '#F1F0FB',
					'gray-neutral': '#8E9196',
					dark: '#1A1F2C'
				},
				cream: "#FDF8F3",
				"cream-warm": "#FFF5EB",
				"cream-deep": "#F7EDE0",
				"brand-orange": "#E86A33",
				"brand-amber": "#F2A93B",
				"brand-gold": "#FFB84D",
				"fox-orange": "#C45D26",
				"fox-amber": "#E8923A",
				success: "#2D9D5D",
				danger: "#D64545",
				/* Pitch demo colors */
				'pitch-cream': '#F7F0E8',
				'pitch-card': '#FFFFFF',
				'pitch-muted': '#EDE6DC',
				'pitch-text': '#1A1A1A',
				'pitch-secondary': '#5C5348',
				'pitch-tertiary': '#8C8276',
				'pitch-orange': '#E8892A',
				'pitch-orange-light': '#FFF3E0',
				'pitch-green': '#22A559',
				'pitch-green-light': '#E6F5EC',
				'pitch-red': '#D9382E',
				'pitch-red-light': '#FDEAE8',
				'pitch-border': '#E0D8CE',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					"0%": {
						opacity: "0",
						transform: "translateY(10px)"
					},
					"100%": {
						opacity: "1",
						transform: "translateY(0)"
					}
				},
				'slide-in': {
					"0%": {
						opacity: "0",
						transform: "translateX(-20px)"
					},
					"100%": {
						opacity: "1",
						transform: "translateX(0)"
					}
				},
				'flip-loop': {
					'0%, 100%': { transform: 'rotateY(0deg)' },
					'50%': { transform: 'rotateY(180deg)' },
				},
				fadeInUp: {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				'caret-blink': {
					'0%,70%,100%': { opacity: '1' },
					'20%,50%': { opacity: '0' },
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-12px)' },
				},
				'pulse-glow': {
					'0%, 100%': { boxShadow: '0 0 20px rgba(232, 106, 51, 0.2)' },
					'50%': { boxShadow: '0 0 40px rgba(232, 106, 51, 0.5)' },
				},
				'bounce-subtle': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-6px)' },
				},
				'waveform': {
					'0%, 100%': { height: '4px' },
					'50%': { height: '24px' },
				},
				'pulse-ring': {
					'0%': { boxShadow: '0 0 0 0 rgba(232, 137, 42, 0.4)' },
					'100%': { boxShadow: '0 0 0 8px rgba(232, 137, 42, 0)' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-out forwards',
				'slide-in': 'slide-in 0.5s ease-out forwards',
				'flip-loop': 'flip-loop 3s linear infinite',
				'fade-in-up': 'fadeInUp 0.7s ease-out forwards',
				'caret-blink': 'caret-blink 1.25s ease-out infinite',
				'float': 'float 6s ease-in-out infinite',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
				'waveform': 'waveform 0.8s ease-in-out infinite',
				'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
			},
			fontFamily: {
				'outfit': ['Outfit', 'sans-serif'],
				caveat: ['"Caveat"', 'cursive'],
				saira: ['"Saira"', 'sans-serif'],
				display: ['"Playfair Display"', 'serif'],
				sans: ['Inter', 'sans-serif'],
				mono: ['"JetBrains Mono"', 'monospace'],
			},
			boxShadow: {
				'glow-red': '0 0 15px 5px rgba(230, 57, 70, 0.4)',
				'glow-red-light': '0 0 20px 8px rgba(230, 57, 70, 0.3)',
				xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
				glow: '0 4px 24px rgba(232, 106, 51, 0.3)',
				'glow-lg': '0 8px 40px rgba(232, 106, 51, 0.4)',
				'card': '0 4px 24px rgba(26, 26, 26, 0.06)',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
