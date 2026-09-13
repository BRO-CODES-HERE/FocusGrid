/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#0F172A',
        indigoDark: '#1E1B4B',
        emerald: '#10B981',
        emeraldDark: '#059669',
        slateBorder: '#334155',
        slateMuted: '#64748B',
        slateText: '#94A3B8',
        intellect: '#3B82F6',
        strength: '#EF4444',
        agility: '#22C55E',
        wisdom: '#F59E0B',
      },
    },
  },
  plugins: [],
};
