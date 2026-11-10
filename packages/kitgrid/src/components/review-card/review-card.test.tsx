import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ReviewCard } from "./review-card.js"

describe("ReviewCard", () => {
  it("renders the review with purchase details", () => {
    render(
      <ReviewCard
        author="Priya S."
        rating={4}
        title="Soft and breathable"
        body="Runs slightly large."
        verified
        variant="Sage / M"
      />,
    )
    expect(screen.getByRole("article")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Soft and breathable" })).toBeInTheDocument()
    expect(screen.getByText("Verified buyer")).toBeInTheDocument()
    expect(screen.getByText("Sage / M")).toBeInTheDocument()
  })

  it("counts one helpful vote and then locks the button", async () => {
    const onHelpful = jest.fn()
    render(
      <ReviewCard author="Priya S." rating={5} body="Great." helpfulCount={12} onHelpful={onHelpful} />,
    )
    const button = screen.getByRole("button", { name: "Mark review as helpful, 12" })
    await userEvent.click(button)
    expect(onHelpful).toHaveBeenCalledTimes(1)
    expect(button).toHaveAttribute("aria-pressed", "true")
    expect(button).toHaveTextContent("Helpful (13)")
    expect(button).toBeDisabled()
  })
})
