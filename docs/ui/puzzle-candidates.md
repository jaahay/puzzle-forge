# Puzzle Candidate Backlog

Broad candidate list for future Puzzle Forge puzzle types and variants. This is not a commitment to build all of them; it is a planning artifact for UI architecture and generator roadmap work.

## Why this exists

The shared workspace layout should support many puzzle families without each puzzle inventing its own page shape.

Every candidate should be evaluated by:

- board model: grid, graph, cards, words, tiles, paths, regions, or hybrid;
- input model: click, toggle, digit entry, edge drawing, drag/drop, text entry, or card interaction;
- generator difficulty;
- validation approach;
- mobile risk;
- fit with Header / Status / Board / Gameplay / Generation.

## Candidate list

1. Sudoku variants
2. Jigsaw Sudoku
3. Killer Sudoku
4. Thermo Sudoku
5. Sandwich Sudoku
6. Diagonal Sudoku
7. Anti-Knight Sudoku
8. Anti-King Sudoku
9. Consecutive Sudoku
10. Even/Odd Sudoku
11. Greater-Than Sudoku
12. XV Sudoku
13. Kropki Sudoku
14. Little Killer Sudoku
15. Samurai Sudoku
16. Futoshiki
17. Kakuro
18. KenKen / Calcudoku
19. Latin Square
20. Strimko
21. Takuzu / Binairo
22. Hitori
23. Akari / Light Up
24. Nurikabe
25. Slitherlink
26. Masyu
27. Hashiwokakero / Bridges
28. Shikaku
29. Fillomino
30. Tents
31. Star Battle
32. Minesweeper variants
33. Nonogram variants
34. Color Nonogram
35. Mini Crossword
36. Cryptogram
37. Word Ladder
38. Word Grid
39. Word Search
40. Letter-loop word puzzle
41. Hidato
42. Numbrix
43. Numberlink
44. Arukone
45. Nurimaze
46. Yajilin
47. Heyawake
48. Kuromasu
49. Cave / Bag
50. Tapa
51. LITS
52. Nurikabe variants
53. Country Road
54. Ripple Effect
55. Suguru / Tectonic
56. Calcrostic
57. Skyscrapers
58. Battleships
59. Galaxies
60. Spiral Galaxies
61. Corral
62. Castle Wall
63. Linesweeper
64. Creek
65. Aquarium
66. Binary puzzle variants
67. Magnets
68. Mosaic
69. Fill-a-Pix
70. Nurikabe Islands
71. Star Battle variants
72. Statue Park
73. Pentomino packing
74. Polyomino tiling
75. Tangram packing
76. Sliding puzzle variants
77. Fifteen puzzle
78. Block-traffic puzzle
79. Sokoban mini
80. Peg Solitaire variants
81. Klondike variants
82. FreeCell
83. Spider Solitaire
84. Yukon
85. Golf Solitaire
86. Pyramid Solitaire
87. TriPeaks
88. Canfield
89. Forty Thieves
90. Scorpion
91. Accordion Solitaire
92. Clock Solitaire
93. Calculation Solitaire
94. Baker's Game
95. Beleaguered Castle
96. Aces Up
97. Single-deck tableau variants
98. Open-cell solitaire variants
99. Reserve-pile solitaire variants
100. Fan-pile solitaire variants
101. Chess mate-in-one
102. Chess mate-in-two
103. Chess endgame drills
104. Knight's tour
105. Queens puzzle / N-Queens
106. Flow-style path puzzle
107. Maze generation and solving
108. Logic grid mystery puzzles
109. Zebra puzzle
110. Einstein riddle variants
111. Mastermind-style code puzzle
112. Bulls and Cows
113. Set-style pattern finding
114. Memory match
115. Pattern sequence puzzles
116. Arithmetic path puzzles
117. Equation crossword
118. Operator placement puzzles
119. Map coloring puzzles
120. Daily mixed puzzle set

## Near-term candidates

Good early additions should reuse existing primitives:

1. Futoshiki: grid plus inequality constraints; close to Sudoku.
2. Takuzu: binary grid; simple mobile input.
3. Hitori: grid toggle/shading; simple validation.
4. Akari: grid plus light propagation; strong visual payoff.
5. Tents: grid toggle with row/column counts.
6. FreeCell: extends card-stack architecture after Klondike stabilizes.
7. Sudoku variants: strong fit once variant config and status summaries are clean.

## Architecture implications

Required shared workspace slots:

- Header: identity and short description.
- Status: current puzzle facts.
- Board: primary game surface.
- Gameplay: high-frequency controls near the board.
- Generation: seed, variants, difficulty, size, randomization, reproducibility.

Likely shared capabilities:

- compact seed display with copy icon;
- variant summaries;
- solvability and uniqueness badges;
- board overflow discipline;
- validation result display;
- undo/redo affordances;
- stable generation state that does not collapse layout;
- mobile dropdown navigation;
- puzzle-specific input adapters.
