# Glossary

## Backsplash

A separate drawn piece placed against an existing countertop edge. A backsplash has a length based on the selected countertop edge span and a user-selected height such as 3 inches, 4 inches, 5 inches, or custom.

After creation, a backsplash behaves like a normal drawn piece: it can be selected, moved, deleted, and included in square-foot totals. It still needs a distinct identity so users can count countertop pieces separately from backsplash pieces.

Backsplash creation starts from a side-panel Back Splash button. Pressing the button opens a popup like the offset popup. The popup lets the user choose backsplash height presets, enter any custom backsplash height, save a custom height for quick reuse, and enter offset distance from the countertop piece. Backsplash width is not entered in the popup because the length comes from the selected countertop corners.

Saved backsplash height presets are company-wide. Users expect the same backsplash height presets to be available whenever they open a quote drawing.

The drawing tool is a separate product capability from the CRM. Customers may subscribe to the CRM only, the drawing tool only, or both together.

Drawing-only customers still need a lightweight business shell for projects, saved drawings, and possibly invoices, without requiring the full CRM pipeline.

Backsplash work will start inside the current quote drawing page, while using drawing-specific concepts and names so the drawing tool can be separated as a product module later.

Backsplash pieces use simple sequential labels such as "Backsplash 1" on the canvas. Dimensions communicate the exact size.

Backsplash pieces are rectangular and aligned to the selected edge span.

Backsplash offset is the gap between the countertop edge and the backsplash piece. An offset of 0 inches places the backsplash flush against the countertop edge.

Backsplash offset has a visible default of 3 inches. The default should be easy to adjust from one named constant, not hidden inside drawing logic.

Backsplash height has a visible default of 4 inches. The default should be easy to adjust from one named constant, not hidden inside drawing logic.

The backsplash popup has a Start button. Clicking Start closes the popup and activates corner selection. Clicking the Back Splash button again reopens the popup so the user can change height or offset.

Back Splash corner selection is hidden until the user clicks near a countertop corner. The first selected corner appears as a small black dot so the user can see what was caught without cluttering the drawing.

If the user chooses two backsplash corners that are not adjacent corners on the same countertop piece, the app tells the user to choose an adjacent corner and keeps the first corner selected.

After creating a backsplash, the Back Splash tool stays active so the user can create additional backsplashes without reopening the tool.

After a backsplash is created, the new backsplash piece becomes selected so the user can immediately see it, move it, or edit its dimensions.

Backsplash pieces use the same visual fill and stroke as countertop pieces when created. Users can later use the coloring tool to color backsplash pieces.

Drawn pieces have a product identity so the system can distinguish countertop pieces from backsplash pieces for counts and future pricing.

Square footage reporting should support countertop square footage, backsplash square footage, and combined total square footage.

Backsplashes are created from one countertop corner to an adjacent countertop corner. Partial edge runs are not selected during backsplash creation.

When the Back Splash tool is active, the canvas remains visually clean until the user selects a corner.

Clicking near a countertop corner while the Back Splash tool is active catches the nearest valid corner within the corner selection tolerance.

Back Splash click sounds are optional future polish and should not be part of the first build slice.

Only actual countertop corners can be selected for backsplash creation. Middle points along an edge are not valid backsplash anchors.

After the user chooses two adjacent backsplash corners, the app asks for direction visually: the user chooses which side of the selected edge span receives the backsplash, similar to an offset workflow.

No ghost preview is required before backsplash creation. The user chooses two adjacent corners, then clicks the desired side/direction, and the backsplash is created immediately.
