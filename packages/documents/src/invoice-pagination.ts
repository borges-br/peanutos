export interface InvoicePaginationResult {
  pages: number;
  density: "comfortable" | "compact";
  overflow: boolean;
}

/**
 * Browser-only, with no imports or captured state: the same function runs inside
 * Chromium for PDF generation and against the sandboxed preview's document.
 * Call after fonts and images have loaded. Never scale or discard invoice text.
 */
export function paginateInvoiceDocument(
  doc: Document = document,
): InvoicePaginationResult | null {
  const root = doc.querySelector<HTMLElement>(".invoice-document");
  if (!root) return null;
  if (root.dataset.paginated === "true")
    return JSON.parse(root.dataset.paginationResult!);
  const flow = root.querySelector<HTMLElement>(".invoice-flow");
  if (!flow) return null;
  const source = Array.from(
    flow.children,
    (element) => element.cloneNode(true) as HTMLElement,
  );
  const header = root.querySelector<HTMLTemplateElement>(
    "[data-invoice-header]",
  );
  const footer = root.querySelector<HTMLTemplateElement>(
    "[data-invoice-footer]",
  );
  const pageLabel = root.dataset.invoicePageLabel || "Página";
  const ofLabel = root.dataset.invoiceOfLabel || "de";
  const totalLabel = root.dataset.invoiceTotalLabel || "Valor total";
  const paymentLabel = root.dataset.invoicePaymentLabel || "Pagamento";
  const hasTotal = !!flow.querySelector(".block-financial-summary");
  const hasPayment = !!flow.querySelector(".block-payment-info");
  const referencePlaceholder = [
    hasTotal && totalLabel,
    hasPayment && paymentLabel,
  ]
    .filter(Boolean)
    .map((label) => `${label}: ${pageLabel.toLowerCase()} 999.`)
    .join(" ");
  flow.remove();
  root.dataset.paginated = "true";
  let pages: HTMLElement[] = [];

  const body = (page: HTMLElement) =>
    page.querySelector<HTMLElement>(".invoice-page-body")!;
  function makePage(reference = false) {
    const page = doc.createElement("section");
    page.className = "invoice-page";
    if (pages.length && header) {
      page.append(header.content.cloneNode(true));
      page.querySelector("h2")!.textContent =
        root!.dataset.invoiceDetailsTitle || "";
    }
    const content = doc.createElement("div");
    content.className = "invoice-page-body";
    page.append(content);
    const end = doc.createElement("footer");
    end.className = "invoice-page-footer";
    if (reference && referencePlaceholder) {
      const notice = doc.createElement("div");
      notice.className = "invoice-page-reference";
      notice.textContent = referencePlaceholder;
      end.append(notice);
    }
    if (footer) end.append(footer.content.cloneNode(true));
    const counter = doc.createElement("span");
    counter.className = "invoice-page-number";
    counter.textContent = `${pageLabel} 999 ${ofLabel} 999`;
    end.append(counter);
    page.append(end);
    root!.append(page);
    pages.push(page);
    return page;
  }
  function available(page: HTMLElement) {
    const style = doc.defaultView!.getComputedStyle(page);
    const heading = page.querySelector<HTMLElement>(
      ".invoice-continuation-heading",
    );
    const headingHeight = heading
      ? heading.getBoundingClientRect().height +
        parseFloat(doc.defaultView!.getComputedStyle(heading).marginBottom)
      : 0;
    return (
      page.getBoundingClientRect().height -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom) -
      page
        .querySelector<HTMLElement>(".invoice-page-footer")!
        .getBoundingClientRect().height -
      headingHeight -
      2
    );
  }
  const fits = (page: HTMLElement) =>
    body(page).getBoundingClientRect().height <= available(page);
  const clear = () => {
    pages.forEach((page) => page.remove());
    pages = [];
  };

  // Prefer one page by reducing whitespace, not by shrinking legible type.
  for (const density of ["comfortable", "compact"] as const) {
    root.classList.toggle("invoice-density-compact", density === "compact");
    const page = makePage();
    source.forEach((element) => body(page).append(element.cloneNode(true)));
    if (fits(page)) {
      page.querySelector(".invoice-page-number")!.textContent =
        `${pageLabel} 1 ${ofLabel} 1`;
      const result = { pages: 1, density, overflow: false };
      root.dataset.paginationResult = JSON.stringify(result);
      return result;
    }
    clear();
  }

  let current = makePage(true);
  const nextPage = () => {
    current = makePage(true);
    return current;
  };
  function fitsOnNewPage(element: HTMLElement) {
    const probe = makePage(true);
    if (element.matches(".block-billing-closing"))
      probe.classList.add("invoice-closing-only");
    body(probe).append(element.cloneNode(true));
    const result = fits(probe);
    probe.remove();
    pages.pop();
    return result;
  }

  // Split an exceptionally long description or note without dropping text or
  // flattening markup. Numeric cells are retained on the first row fragment only.
  function split(
    element: HTMLElement,
    offset: number,
  ): [HTMLElement, HTMLElement] {
    const walker = doc.createTreeWalker(element, 4 /* SHOW_TEXT */);
    let node: Node | null,
      remaining = offset;
    while ((node = walker.nextNode())) {
      const length = node.textContent?.length || 0;
      if (remaining <= length) break;
      remaining -= length;
    }
    if (!node)
      return [
        element.cloneNode(true) as HTMLElement,
        element.cloneNode(false) as HTMLElement,
      ];
    const before = doc.createRange();
    before.selectNodeContents(element);
    before.setEnd(node, remaining);
    const after = doc.createRange();
    after.selectNodeContents(element);
    after.setStart(node, remaining);
    const first = element.cloneNode(false) as HTMLElement,
      rest = element.cloneNode(false) as HTMLElement;
    first.append(before.cloneContents());
    rest.append(after.cloneContents());
    return [first, rest];
  }
  function largestFragment(
    element: HTMLElement,
    measure: (part: HTMLElement) => boolean,
  ) {
    const text = element.textContent || "";
    let lo = 1,
      hi = text.length - 1,
      best = 0;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (measure(split(element, mid)[0])) {
        best = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    const word = text.lastIndexOf(" ", best);
    if (word > best * 0.8) best = word + 1;
    if (!best) throw new Error("O conteúdo não cabe na área útil da fatura.");
    return split(element, best);
  }

  function place(element: HTMLElement) {
    body(current).append(element);
    if (fits(current)) return;
    element.remove();
    if (body(current).children.length) {
      const prefix = split(
        element,
        Math.min(160, element.textContent?.length || 0),
      )[0];
      body(current).append(prefix);
      const prefixFits = fits(current);
      prefix.remove();
      if (fitsOnNewPage(element) || !prefixFits) nextPage();
    }
    if (element.matches(".block-billing-closing") && pages.length > 1) {
      current.classList.add("invoice-closing-only");
      current.querySelector("h2")!.textContent =
        root!.dataset.invoiceClosingTitle || "";
    }
    body(current).append(element);
    if (fits(current)) return;
    element.remove();
    if (element.matches(".block-billing-closing,.block-invoice-issuer")) {
      for (const child of Array.from(element.children))
        place(child as HTMLElement);
      return;
    }
    let rest = element;
    while (rest.textContent?.length) {
      body(current).append(rest);
      if (fits(current)) return;
      rest.remove();
      const [part, tail] = largestFragment(rest, (fragment) => {
        body(current).append(fragment);
        const result = fits(current);
        fragment.remove();
        return result;
      });
      body(current).append(part);
      nextPage();
      rest = tail;
    }
  }

  function table(sourceTable: HTMLElement) {
    const rows = Array.from(
      sourceTable.querySelectorAll<HTMLElement>("tbody > tr"),
    );
    if (!rows.length) {
      place(sourceTable);
      return;
    }
    let chunk: HTMLElement, tbody: HTMLElement;
    function newChunk() {
      chunk = sourceTable.cloneNode(true) as HTMLElement;
      tbody = chunk.querySelector<HTMLElement>("tbody")!;
      tbody.replaceChildren();
      body(current).append(chunk);
    }
    newChunk();
    for (const original of rows) {
      let row = original.cloneNode(true) as HTMLElement;
      tbody!.append(row);
      if (fits(current)) continue;
      row.remove();
      if (!tbody!.children.length) chunk!.remove();
      const singleRowTable = sourceTable.cloneNode(true) as HTMLElement;
      singleRowTable
        .querySelector("tbody")!
        .replaceChildren(row.cloneNode(true));
      // If a row exceeds even an empty page, use the remaining space here for
      // its first fragment instead of leaving half a sheet unused.
      const rowFitsNewPage = fitsOnNewPage(singleRowTable);
      if (body(current).children.length && rowFitsNewPage) {
        nextPage();
        newChunk();
      } else if (!chunk!.isConnected) newChunk();
      tbody!.append(row);
      if (fits(current)) continue;
      row.remove();
      let description = row.firstElementChild as HTMLElement;
      const probeRow = row.cloneNode(true) as HTMLElement;
      probeRow.replaceChild(
        split(
          description,
          Math.min(160, description.textContent?.length || 0),
        )[0],
        probeRow.firstElementChild!,
      );
      tbody!.append(probeRow);
      const prefixFits = fits(current);
      probeRow.remove();
      if (!prefixFits) {
        if (!tbody!.children.length) chunk!.remove();
        nextPage();
        newChunk();
      }
      while (description.textContent?.length) {
        const cell = description;
        row.replaceChild(cell, row.firstElementChild!);
        tbody!.append(row);
        if (fits(current)) break;
        row.remove();
        const [part, rest] = largestFragment(cell, (fragment) => {
          row.replaceChild(fragment, row.firstElementChild!);
          tbody!.append(row);
          const result = fits(current);
          row.remove();
          return result;
        });
        row.replaceChild(part, row.firstElementChild!);
        tbody!.append(row);
        nextPage();
        newChunk();
        row = original.cloneNode(true) as HTMLElement;
        Array.from(row.children)
          .slice(1)
          .forEach((cell) => cell.replaceChildren());
        description = rest;
      }
    }
  }

  try {
    for (const element of source) {
      if (element.matches(".block-items-table")) table(element);
      else place(element);
    }
    const totalPage =
      pages.findIndex(
        (page) => !!page.querySelector(".block-financial-summary"),
      ) + 1;
    const paymentPage =
      pages.findIndex((page) => !!page.querySelector(".block-payment-info")) +
      1;
    pages.forEach((page, index) => {
      page.dataset.pageNumber = String(index + 1);
      page.querySelector(".invoice-page-number")!.textContent =
        `${pageLabel} ${index + 1} ${ofLabel} ${pages.length}`;
      const notice = page.querySelector(".invoice-page-reference");
      const references = [
        totalPage > index + 1 &&
          `${totalLabel}: ${pageLabel.toLowerCase()} ${totalPage}.`,
        paymentPage > index + 1 &&
          `${paymentLabel}: ${pageLabel.toLowerCase()} ${paymentPage}.`,
      ].filter(Boolean);
      if (notice && references.length)
        notice.textContent = references.join(" ");
      else notice?.remove();
    });
    const overflow = pages.some((page) => !fits(page));
    const result: InvoicePaginationResult = {
      pages: pages.length,
      density: "compact",
      overflow,
    };
    root.dataset.paginationResult = JSON.stringify(result);
    return result;
  } catch (error) {
    root.dataset.paginated = "false";
    throw error;
  }
}
