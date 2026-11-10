import { render, screen, within } from "@testing-library/react"
import { ProjectCard } from "./project-card.js"

describe("ProjectCard", () => {
  it("is an article named by the project, linking once and writing the deploy state", () => {
    render(
      <ProjectCard
        name="Revenue"
        domain="revenue.northwind.app"
        href="#revenue"
        state="building"
        commit="Add region filter"
        branch="main"
        updated="12m ago"
      />,
    )
    const card = screen.getByRole("article", { name: "Revenue" })
    expect(within(card).getAllByRole("link")).toHaveLength(1)
    expect(within(card).getByRole("link", { name: "Revenue" })).toHaveAttribute("href", "#revenue")
    expect(within(card).getByText("Building")).toBeInTheDocument()
    expect(card).toHaveTextContent("main")
  })
})
