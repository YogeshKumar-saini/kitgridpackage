/**
 * @internal Classes shared by Breadcrumb and its client-only collapse button. A plain module,
 * since values imported from a "use client" file are references on the server.
 */
export const breadcrumbParts = {
  item: "kg-breadcrumb__item inline-flex min-w-0 items-center",
  separator:
    "kg-breadcrumb__separator inline-grid place-items-center text-kg-fg-muted [&_svg]:size-3.5",
}
