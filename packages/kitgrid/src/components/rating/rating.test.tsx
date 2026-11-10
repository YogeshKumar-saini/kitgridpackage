import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { Rating } from "./rating.js"

describe("Rating", () => {
  describe("display", () => {
    it("summarises value and review count for screen readers", () => {
      render(<Rating value={4.6} count={1284} />)
      expect(screen.getByText("4.6 out of 5 stars, 1,284 reviews")).toBeInTheDocument()
      expect(screen.getByText("(1,284)")).toHaveAttribute("aria-hidden", "true")
    })

    it("uses the singular for one review", () => {
      render(<Rating value={5} count={1} />)
      expect(screen.getByText("5 out of 5 stars, 1 review")).toBeInTheDocument()
    })

    it("fills each star fractionally, rounded to precision", () => {
      const { container } = render(<Rating value={3.74} precision={0.5} />)
      const fills = [
        ...container.querySelectorAll<HTMLElement>(".kg-rating__glyph"),
      ].map((glyph) => glyph.style.getPropertyValue("--_fill"))
      expect(fills).toEqual(["100%", "100%", "100%", "50%", "0%"])
    })

    it("defaults to tenth-of-a-star precision", () => {
      const { container } = render(<Rating value={4.63} />)
      const last = container.querySelectorAll<HTMLElement>(".kg-rating__glyph")[4]
      expect(last?.style.getPropertyValue("--_fill")).toBe("60%")
    })

    it("clamps values above max", () => {
      render(<Rating value={9} max={5} />)
      expect(screen.getByText("5 out of 5 stars")).toBeInTheDocument()
    })

    it("links to reviews with the full summary as the name", () => {
      render(<Rating value={4.2} count={88} href="#reviews" />)
      expect(
        screen.getByRole("link", { name: "4.2 out of 5 stars, 88 reviews" }),
      ).toHaveAttribute("href", "#reviews")
    })

    it("renders no form controls", () => {
      render(<Rating value={3} />)
      expect(screen.queryByRole("radio")).toBeNull()
    })

    it("accepts custom labels", () => {
      render(
        <Rating
          value={4}
          count={2}
          labels={{
            summary: (value, max) => `${value} von ${max} Sternen`,
            reviews: (_, formatted) => `${formatted} Bewertungen`,
          }}
        />,
      )
      expect(screen.getByText("4 von 5 Sternen, 2 Bewertungen")).toBeInTheDocument()
    })
  })

  describe("input", () => {
    it("is a named radio group with one radio per star", () => {
      render(<Rating onValueChange={() => {}} label="Rate this product" />)
      expect(
        screen.getByRole("group", { name: "Rate this product" }),
      ).toBeInTheDocument()
      expect(screen.getAllByRole("radio")).toHaveLength(5)
      expect(screen.getByRole("radio", { name: "1 star" })).toBeInTheDocument()
      expect(screen.getByRole("radio", { name: "4 stars" })).toBeInTheDocument()
    })

    it("selects on click and reports the value", async () => {
      const onValueChange = jest.fn()
      render(<Rating onValueChange={onValueChange} />)
      await userEvent.click(screen.getByRole("radio", { name: "4 stars" }))
      expect(onValueChange).toHaveBeenCalledWith(4)
      expect(screen.getByRole("radio", { name: "4 stars" })).toBeChecked()
    })

    it("honours a controlled value", async () => {
      const Controlled = () => {
        const [value, setValue] = useState(2)
        return (
          <>
            <Rating value={value} onValueChange={setValue} />
            <output>{value}</output>
          </>
        )
      }
      render(<Controlled />)
      expect(screen.getByRole("radio", { name: "2 stars" })).toBeChecked()
      await userEvent.click(screen.getByRole("radio", { name: "5 stars" }))
      expect(screen.getByRole("status")).toHaveTextContent("5")
    })

    it("offers half-star choices at precision 0.5", () => {
      render(<Rating interactive precision={0.5} />)
      expect(screen.getAllByRole("radio")).toHaveLength(10)
      expect(screen.getByRole("radio", { name: "3.5 stars" })).toBeInTheDocument()
    })

    it("previews the hovered value", () => {
      const { container } = render(<Rating interactive defaultValue={1} />)
      const hit = container.querySelectorAll(".kg-rating__hit")[3] as HTMLElement
      fireEvent.pointerEnter(hit, { pointerType: "mouse" })
      const glyphs = container.querySelectorAll<HTMLElement>(".kg-rating__glyph")
      expect(glyphs[3]?.style.getPropertyValue("--_fill")).toBe("100%")
      expect(glyphs[3]).toHaveAttribute("data-preview")
      fireEvent.pointerLeave(
        container.querySelector(".kg-rating__stars") as HTMLElement,
      )
      expect(glyphs[3]?.style.getPropertyValue("--_fill")).toBe("0%")
    })

    it("clears by clicking the chosen star again, Delete, or the Clear button", async () => {
      const onValueChange = jest.fn()
      render(<Rating clearable defaultValue={3} onValueChange={onValueChange} />)
      const three = screen.getByRole("radio", { name: "3 stars" })
      await userEvent.click(three)
      expect(onValueChange).toHaveBeenLastCalledWith(0)
      expect(three).not.toBeChecked()

      await userEvent.click(screen.getByRole("radio", { name: "2 stars" }))
      await userEvent.keyboard("{Delete}")
      expect(onValueChange).toHaveBeenLastCalledWith(0)

      await userEvent.click(screen.getByRole("radio", { name: "4 stars" }))
      await userEvent.click(screen.getByRole("button", { name: "Clear" }))
      expect(onValueChange).toHaveBeenLastCalledWith(0)
    })

    it("does not clear on re-click unless clearable", async () => {
      const onValueChange = jest.fn()
      render(<Rating defaultValue={3} onValueChange={onValueChange} />)
      await userEvent.click(screen.getByRole("radio", { name: "3 stars" }))
      expect(onValueChange).not.toHaveBeenCalled()
      expect(screen.queryByRole("button", { name: "Clear" })).toBeNull()
    })

    it("submits with a form name and marks radios required", () => {
      render(<Rating interactive name="score" required />)
      for (const radio of screen.getAllByRole("radio")) {
        expect(radio).toHaveAttribute("name", "score")
        expect(radio).toBeRequired()
      }
    })

    it("disables every choice when disabled", () => {
      render(<Rating interactive disabled />)
      for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled()
    })

    it("renders the display when readOnly", () => {
      render(<Rating value={4} readOnly onValueChange={() => {}} />)
      expect(screen.queryByRole("radio")).toBeNull()
      expect(screen.getByText("4 out of 5 stars")).toBeInTheDocument()
    })
  })
})
