import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { ReviewSummary } from "./review-summary.js"

const distribution = { 5: 60, 4: 25, 3: 10, 2: 5, 1: 0 }

describe("ReviewSummary", () => {
  it("shows the average, total and a named row per star value", () => {
    render(<ReviewSummary average={4.4} distribution={distribution} />)
    expect(screen.getByText("4.4")).toBeInTheDocument()
    expect(screen.getByText("Based on 100 reviews")).toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: "5 stars: 60 reviews, 60%" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: "1 star: 0 reviews, 0%" }),
    ).toBeInTheDocument()
  })

  it("filters by star value as toggle buttons", async () => {
    const onFilter = jest.fn()
    const Example = () => {
      const [filter, setFilter] = useState<number | null>(null)
      return (
        <ReviewSummary
          average={4.4}
          distribution={distribution}
          filter={filter}
          onFilter={(stars) => {
            onFilter(stars)
            setFilter(stars)
          }}
        />
      )
    }
    render(<Example />)
    const four = screen.getByRole("button", { name: "4 stars: 25 reviews, 25%" })
    expect(screen.getByRole("button", { name: /^1 star/ })).toBeDisabled()
    await userEvent.click(four)
    expect(onFilter).toHaveBeenLastCalledWith(4)
    expect(four).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(screen.getByRole("button", { name: "Show all reviews" }))
    expect(onFilter).toHaveBeenLastCalledWith(null)
    expect(four).toHaveAttribute("aria-pressed", "false")
  })

  it("offers a write-a-review action and localizes numbers", async () => {
    const onWriteReview = jest.fn()
    render(
      <ReviewSummary
        average={4.4}
        count={1284}
        distribution={distribution}
        locale="de-DE"
        onWriteReview={onWriteReview}
      />,
    )
    expect(screen.getByText("4,4")).toBeInTheDocument()
    expect(screen.getByText("Based on 1.284 reviews")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Write a review" }))
    expect(onWriteReview).toHaveBeenCalled()
  })
})
