import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { InfiniteList } from "./infinite-list.js"

type Callback = (entries: { isIntersecting: boolean }[]) => void

describe("InfiniteList", () => {
  let trigger: Callback | undefined
  const Original = globalThis.IntersectionObserver

  beforeEach(() => {
    globalThis.IntersectionObserver = class {
      constructor(callback: Callback) {
        trigger = callback
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return []
      }
    } as unknown as typeof IntersectionObserver
  })
  afterEach(() => {
    globalThis.IntersectionObserver = Original
    trigger = undefined
  })

  it("loads more when the sentinel intersects", () => {
    const onLoadMore = jest.fn()
    render(
      <InfiniteList onLoadMore={onLoadMore} hasMore>
        <p>Row</p>
      </InfiniteList>,
    )
    trigger?.([{ isIntersecting: true }])
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it("does not observe while loading or when exhausted", () => {
    const onLoadMore = jest.fn()
    const { rerender, container } = render(
      <InfiniteList onLoadMore={onLoadMore} hasMore loading>
        <p>Row</p>
      </InfiniteList>,
    )
    expect(trigger).toBeUndefined()
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true")
    expect(screen.getByRole("status")).toHaveTextContent("Loading more")
    rerender(
      <InfiniteList onLoadMore={onLoadMore} hasMore={false} labels={{ end: "All caught up" }}>
        <p>Row</p>
      </InfiniteList>,
    )
    expect(trigger).toBeUndefined()
    expect(screen.getByRole("status")).toHaveTextContent("All caught up")
  })

  it("offers a keyboard fallback button", async () => {
    const user = userEvent.setup()
    const onLoadMore = jest.fn()
    render(
      <InfiniteList onLoadMore={onLoadMore} hasMore showButton>
        <p>Row</p>
      </InfiniteList>,
    )
    await user.click(screen.getByRole("button", { name: "Load more" }))
    expect(onLoadMore).toHaveBeenCalled()
  })
})
