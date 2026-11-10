import { render, screen, within } from "@testing-library/react"
import { DeployStatus } from "./deploy-status.js"

describe("DeployStatus", () => {
  it("lists steps with written states and marks the running one current", () => {
    render(
      <DeployStatus
        aria-label="Deployment"
        steps={[
          { id: "install", label: "Install", state: "done", duration: "18s" },
          { id: "build", label: "Build", state: "running", duration: "42s" },
          { id: "deploy", label: "Deploy", state: "queued" },
        ]}
      />,
    )
    const steps = within(screen.getByRole("list", { name: "Deployment" })).getAllByRole("listitem")
    expect(steps[0]).toHaveTextContent("InstallDone18s")
    expect(steps[1]).toHaveAttribute("aria-current", "step")
    expect(steps[2]).toHaveTextContent("Queued")
    expect(steps[2]).not.toHaveAttribute("aria-current")
  })
})
