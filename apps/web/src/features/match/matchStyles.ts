const matchStyles = {
  container: "mx-auto grid max-w-[1180px] gap-6",
  formPage: `
    min-h-screen px-6 pt-8 pb-12
    match-mobile:min-h-[calc(100vh-60px)] match-mobile:px-4
    match-mobile:pt-6 match-mobile:pb-8
  `,
  detailPage: `
    min-h-screen px-6 pt-10 pb-14 match-mobile:min-h-[calc(100vh-60px)]
    match-mobile:w-full match-mobile:px-4 match-mobile:pt-6 match-mobile:pb-8
  `,
  detailContainer:
    "mx-auto grid max-w-[1180px] gap-6 [&>.lucarne-button]:justify-self-start!",
  detailCard: `
    grid gap-6 rounded-[var(--radius-surface)] border border-[var(--color-border-default)]
    bg-[var(--color-bg-surface)] p-8 match-mobile:px-5 match-mobile:py-6
    [&_dl]:m-0 [&_dl]:grid [&_dl]:gap-4 [&_dl_div]:grid [&_dl_div]:gap-1
    [&_dt]:text-[13px] [&_dt]:font-bold [&_dt]:text-[var(--color-text-secondary)]
    [&_dt]:uppercase [&_dd]:m-0
  `,
  formCard: `
    grid w-full gap-6 rounded-[var(--radius-surface)] border
    border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-6
    match-mobile:rounded-none match-mobile:border-x-0 match-mobile:px-4
    match-mobile:py-5
  `,
  formActions:
    "flex justify-end match-mobile:w-full match-mobile:[&_.lucarne-button]:w-full!",
  nameLink: `
    font-bold text-[var(--color-text-primary)] underline underline-offset-[3px]
    focus-visible:outline-2 focus-visible:outline-offset-2
    focus-visible:outline-[var(--color-action-primary)]
  `,
  tableWrapper: `
    overflow-x-auto rounded-[var(--radius-surface)] border
    border-[var(--color-border-default)] bg-[var(--color-bg-surface)]
    shadow-[var(--shadow-surface)] match-compact:hidden
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
  fieldset: `
    m-0 mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]
    gap-4 border-0 p-0 [&_legend]:mb-4 [&_legend]:font-semibold
  `,
  filterField: `
    grid gap-2 [&>span]:flex [&>span]:items-center [&>span]:gap-1.5
    [&>span]:text-[14px] [&>span]:font-semibold
    [&>span]:text-[var(--color-text-secondary)]
  `,
  dashboardFilterField: `
    min-w-0 flex-[1_1_190px] match-mobile:w-full match-mobile:flex-none
  `,
  resetButton: `
    min-w-[120px] flex-none self-end! whitespace-nowrap
    match-mobile:order-5 match-mobile:w-full
  `,
  publicPage: `
    mx-auto max-w-[1120px] px-6 pt-8 pb-12 [&>p]:mx-0 [&>p]:my-4
    [&_h1]:[overflow-wrap:anywhere]
  `,
};

export { matchStyles };
