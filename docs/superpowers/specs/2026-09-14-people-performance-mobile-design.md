# People, Performance Export and Mobile Design

Set people pagination to 15 through its shared constant while retaining the legacy unpaginated picker limit of 50. Reuse the existing performance query and range calculation in a server-only report builder consumed by both the page and a protected XLSX route.

Use SheetJS CE 0.20.3 from its official CDN tarball. The client passes the current URL query to the route and downloads the response; the route calls `requireAdmin` through the shared report function. Quantity columns come from labels actually present in the filtered dataset, in stable order.

Add a typed Next viewport export with `width: "device-width"` and `initialScale: 1`. Set form controls to 16px only under the existing mobile breakpoint. Do not change overflow containment without a measured authenticated overflow offender.
