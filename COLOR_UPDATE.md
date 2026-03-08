# Color Scheme Update: Vivid

Replace the current muted dark theme with a vivid, high-energy neon dark palette across the entire app.

## NEW COLOR PALETTE

### Backgrounds (deeper, richer darks):
- Page bg: #080010 (deep dark purple-black — replaces #0d0d0d)
- Card bg: #0e0820 (deep purple tint — replaces #111111)
- Card hover: #130a28 (replaces #161616)
- Border: #2d1f4e (purple-tinted border — replaces #2a2a2a)
- Inner border: #1e1235 (replaces #1a1a1a)
- Footer/muted bg: #0a0618 (replaces #0f0f0f, #080808)

### Text:
- Primary: #f0e8ff (warm white with purple tint — replaces #e8e8e8)
- Secondary: #9d85c4 (muted purple — replaces #888888)
- Muted: #5a4878 (replaces #444444)
- Very muted: #3d2f5a (replaces #333333)

### Accent Colors (vivid neons):
- Cyan/primary: #00ffff (pure bright cyan — replaces #00e5ff)
- Purple/secondary: #bf5fff (vivid violet — replaces #7c3aed / #a78bfa)
- Green: #00ff88 (neon green — replaces #22c55e)
- Yellow: #ffe100 (vivid yellow — replaces #facc15)
- Red: #ff2d55 (vivid pink-red — replaces #ef4444)
- Orange: #ff6b00 (vivid orange — replaces #f97316)
- Pink: #ff3dab (hot pink — for email-drip agent accent)
- Blue: #3d9dff (vivid blue)

### Glow Effects — add to key elements:
- Cyan glow: box-shadow: 0 0 20px rgba(0, 255, 255, 0.15)
- Purple glow: box-shadow: 0 0 20px rgba(191, 95, 255, 0.15)
- Green glow: box-shadow: 0 0 12px rgba(0, 255, 136, 0.15)

### Gradient Accents:
- Header logo gradient: from #00ffff to #bf5fff (replaces flat cyan)
- Active nav item: bg gradient from #00ffff/10 to #bf5fff/10
- Stat cards: subtle top border gradient

## WHAT TO UPDATE

Update ALL of these files to use the new palette:

1. **app/globals.css** — update CSS variables and any base styles
2. **app/layout.tsx** — header colors, body bg, EREL.AI logo colors
3. **components/layout/Sidebar.tsx** — nav item colors, active states, group labels, borders
4. **app/page.tsx** — badge colors, section borders (but keep content intact)
5. **app/tasks/page.tsx** — column headers, cards, priority badges, search bar
6. **app/calendar/page.tsx** — event category colors, filter chips, grid
7. **app/memory/page.tsx** — category pills, cards, search bar
8. **app/projects/page.tsx** — status badges, progress bars, cards
9. **app/documents/page.tsx** — type badges, rows, filters
10. **app/team/page.tsx** — status dots, workload bars, cards, section headers
11. **app/office/page.tsx** — agent glow colors, terminal nodes, desk colors
12. **app/activity/page.tsx** — category colors, feed items, filter buttons
13. **app/system/page.tsx** — health indicators, service cards
14. **app/operations/page.tsx** — all agent cards, log terminal, stats (if file exists)

## SPECIFIC REPLACEMENTS (do a careful find-and-replace in each file):

```
#0d0d0d  → #080010
#111111  → #0e0820
#111     → #0e0820
#161616  → #130a28
#2a2a2a  → #2d1f4e
#1a1a1a  → #1e1235
#0f0f0f  → #0a0618
#080808  → #0a0618
#e8e8e8  → #f0e8ff
#888888  → #9d85c4
#888     → #9d85c4
#444444  → #5a4878
#444     → #5a4878
#333333  → #3d2f5a
#333     → #3d2f5a
#00e5ff  → #00ffff
#7c3aed  → #bf5fff
#a78bfa  → #bf5fff
#22c55e  → #00ff88
#facc15  → #ffe100
#ef4444  → #ff2d55
#f97316  → #ff6b00
```

## ENHANCED ELEMENTS

1. **EREL.AI logo in header**: Make "EREL" use gradient text from #00ffff to #bf5fff
   ```tsx
   <span className="font-bold text-base tracking-tight" style={{background: 'linear-gradient(135deg, #00ffff, #bf5fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
     EREL<span style={{background: 'linear-gradient(135deg, #bf5fff, #ff3dab)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>.AI</span>
   </span>
   ```

2. **Active sidebar item**: Add left border glow
   ```
   border-l-2 border-[#00ffff] bg-gradient-to-r from-[#00ffff]/10 to-[#bf5fff]/5
   ```

3. **Pulsing status dot**: Make the live indicator in the header use #00ff88

4. **Card hover state**: Add subtle purple glow on hover
   ```
   hover:shadow-[0_0_20px_rgba(191,95,255,0.1)] hover:border-[#3d2f5a]
   ```

5. **Section headers** (the small uppercase tracking labels): Use #00ffff

6. **Stats/metric numbers**: Bold and in #00ffff or #00ff88

7. **Priority badges**:
   - critical: bg-[#ff2d55]/15 text-[#ff2d55] border-[#ff2d55]/30
   - high: bg-[#ff6b00]/15 text-[#ff6b00] border-[#ff6b00]/30
   - medium: bg-[#ffe100]/15 text-[#ffe100] border-[#ffe100]/30
   - low: bg-[#3d9dff]/15 text-[#3d9dff] border-[#3d9dff]/30

8. **Status badges**:
   - active/online: bg-[#00ff88]/15 text-[#00ff88] border-[#00ff88]/30
   - warning/away: bg-[#ffe100]/15 text-[#ffe100] border-[#ffe100]/30
   - error/blocked: bg-[#ff2d55]/15 text-[#ff2d55] border-[#ff2d55]/30
   - planning: bg-[#3d9dff]/15 text-[#3d9dff] border-[#3d9dff]/30

## AFTER UPDATING ALL FILES:

1. Run: npm run build
2. Fix TypeScript/build errors if any
3. Deploy: npx netlify-cli deploy --prod --dir=out --site fbdb76d0-6931-4a88-aa73-55284eeaef00
4. When deployed: openclaw system event --text "Done: Vivid color scheme deployed to Netlify" --mode now
