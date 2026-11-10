import { describeBackdrop, describeCanvasBackdrop } from "../../../test/backdrop-kit.js"
import { SquaresGrid } from "./squares-grid.js"

describeBackdrop("SquaresGrid", SquaresGrid, "kg-squares-grid")
describeCanvasBackdrop("SquaresGrid", SquaresGrid)
