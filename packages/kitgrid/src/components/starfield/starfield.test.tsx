import { describeBackdrop, describeCanvasBackdrop } from "../../../test/backdrop-kit.js"
import { Starfield } from "./starfield.js"

describeBackdrop("Starfield", Starfield, "kg-starfield")
describeCanvasBackdrop("Starfield", Starfield)
