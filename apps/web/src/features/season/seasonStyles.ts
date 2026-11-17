const seasonStyles = {
  container: "mx-auto grid max-w-[1180px] gap-6",
  formPage: `
    min-h-screen px-6 pt-8 pb-12
    season-mobile:min-h-[calc(100vh-60px)] season-mobile:px-4
    season-mobile:pt-6 season-mobile:pb-8
  `,
  detailPage: `
    min-h-screen px-6 pt-10 pb-14 season-mobile:min-h-[calc(100vh-60px)]
    season-mobile:w-full season-mobile:px-4 season-mobile:pt-6 season-mobile:pb-8
  `,
  detailContainer:
    "mx-auto grid max-w-[1180px] gap-6 [&>.lucarne-button]:justify-self-start!",
  detailCard: `
    grid gap-6 rounded-[var(--radius-surface)] border border-[var(--color-border-default)]
    bg-[var(--color-bg-surface)] p-8 season-mobile:px-5 season-mobile:py-6
    [&_dl]:m-0 [&_dl]:grid [&_dl]:gap-4 [&_dl_div]:grid [&_dl_div]:gap-1
    [&_dt]:text-[13px] [&_dt]:font-bold [&_dt]:text-[var(--color-text-secondary)]
    [&_dt]:uppercase [&_dd]:m-0
  `,
  formCard: `
    grid w-full gap-6 rounded-[var(--radius-surface)] border
    border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-6
    season-mobile:rounded-none season-mobile:border-x-0 season-mobile:px-4
    season-mobile:py-5
  `,
  formFields: "grid gap-5",
  formActions:
    "flex justify-end season-mobile:w-full season-mobile:[&_.lucarne-button]:w-full!",
  backLink:
    "lucarne-button lucarne-button--ghost min-h-9! justify-self-start! px-3! py-0!",
  nameLink: `
    font-bold text-[var(--color-text-primary)] underline underline-offset-[3px]
    focus-visible:outline-2 focus-visible:outline-offset-2
    focus-visible:outline-[var(--color-action-primary)]
  `,
  tableWrapper: `
    overflow-x-auto rounded-[var(--radius-surface)] border
    border-[var(--color-border-default)] bg-[var(--color-bg-surface)]
    shadow-[var(--shadow-surface)] season-compact:hidden
  `,
  table: `
    w-full min-w-[940px] border-collapse [&_th]:border-b [&_td]:border-b
    [&_th]:border-[var(--color-border-default)] [&_td]:border-[var(--color-border-default)]
    [&_th]:p-4 [&_td]:p-4 [&_th]:text-left [&_td]:text-left
    [&_th]:align-middle [&_td]:align-middle [&_th]:text-[13px]
    [&_th]:text-[var(--color-text-secondary)] [&_th]:uppercase
    [&_tr:last-child_td]:border-b-0 [&_th:last-child]:w-16 [&_td:last-child]:w-16
    [&_th:last-child]:text-right [&_td:last-child]:text-right
  `,
};

export { seasonStyles };
