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
				}
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
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-out forwards',
				'slide-in': 'slide-in 0.5s ease-out forwards',
				'flip-loop': 'flip-loop 3s linear infinite',
				'fade-in-up': 'fadeInUp 0.7s ease-out forwards',
			},
			fontFamily: {
				'outfit': ['Outfit', 'sans-serif'],
				caveat: ['"Caveat"', 'cursive'],
				saira: ['"Saira"', 'sans-serif'],
			},
			boxShadow: {
				'glow-red': '0 0 15px 5px rgba(230, 57, 70, 0.4)',
				'glow-red-light': '0 0 20px 8px rgba(230, 57, 70, 0.3)',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
