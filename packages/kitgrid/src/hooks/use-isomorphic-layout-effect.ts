"use client"

import { useEffect, useLayoutEffect } from "react"
import { canUseDOM } from "../utils/env.js"

export const useIsomorphicLayoutEffect = canUseDOM ? useLayoutEffect : useEffect
