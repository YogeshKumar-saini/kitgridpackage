import { describeBackdrop, describeCanvasBackdrop } from "../../../test/backdrop-kit.js"
import { BallPit } from "./ball-pit.js"

describeBackdrop("BallPit", BallPit, "kg-ball-pit")
describeCanvasBackdrop("BallPit", BallPit)
