import { describeBackdrop, describeCanvasBackdrop } from "../../../test/backdrop-kit.js"
import { Dither } from "./dither.js"

describeBackdrop("Dither", Dither, "kg-dither")
describeCanvasBackdrop("Dither", Dither)
