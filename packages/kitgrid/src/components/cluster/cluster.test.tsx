import { render, screen } from "@testing-library/react"
import { Cluster } from "./cluster.js"

describe("Cluster", () => {
  it("sets gaps and alignment as private properties", () => {
    render(<Cluster data-testid="cluster" gap={3} rowGap={1} justify="end" />)
    const cluster = screen.getByTestId("cluster")
    expect(cluster).toHaveClass("kg-cluster")
    expect(cluster.style.getPropertyValue("--_gap")).toBe("calc(var(--kg-space) * 3)")
    expect(cluster.style.getPropertyValue("--_row-gap")).toBe("calc(var(--kg-space) * 1)")
    expect(cluster.style.getPropertyValue("--_justify")).toBe("flex-end")
  })

  it("keeps list semantics when rendered as a list", () => {
    render(
      <Cluster as="ul" aria-label="Tags">
        <li>One</li>
        <li>Two</li>
      </Cluster>,
    )
    expect(screen.getByRole("list", { name: "Tags" }).children).toHaveLength(2)
  })
})
