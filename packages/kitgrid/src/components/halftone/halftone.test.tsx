import { describeBackdrop, describeCanvasBackdrop } from "../../../test/backdrop-kit.js"
import { Halftone } from "./halftone.js"

describeBackdrop("Halftone", Halftone, "kg-halftone")
describeCanvasBackdrop("Halftone", Halftone)
