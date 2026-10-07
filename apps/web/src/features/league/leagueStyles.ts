const leagueStyles = {
  container: "mx-auto grid max-w-[1180px] gap-6",
  formPage: `
    min-h-screen px-6 pt-8 pb-12
    league-mobile:min-h-[calc(100vh-60px)] league-mobile:px-4
    league-mobile:pt-6 league-mobile:pb-8
  `,
  detailPage: `
    min-h-screen px-6 pt-10 pb-14 league-mobile:min-h-[calc(100vh-60px)]
    league-mobile:w-full league-mobile:px-4 league-mobile:pt-6 league-mobile:pb-8
  `,
  detailContainer:
    "mx-auto grid max-w-[1180px] gap-6 [&>.lucarne-button]:justify-self-start!",
  detailCard: `
    grid gap-6 rounded-[var(--radius-surface)] border border-[var(--color-border-default)]
    bg-[var(--color-bg-surface)] p-8 league-mobile:px-5 league-mobile:py-6
    [&_dl]:m-0 [&_dl]:grid [&_dl]:gap-4 [&_dl_div]:grid [&_dl_div]:gap-1
    [&_dt]:text-[13px] [&_dt]:font-bold [&_dt]:text-[var(--color-text-secondary)]
    [&_dt]:uppercase [&_dd]:m-0
  `,
  formCard: `
    grid w-full gap-6 rounded-[var(--radius-surface)] border
    border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-6
    league-mobile:rounded-none league-mobile:border-x-0 league-mobile:px-4
    league-mobile:py-5
  `,
  formFields: "grid gap-5",
  formActions:
    "flex justify-end league-mobile:w-full league-mobile:[&_.lucarne-button]:w-full!",
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
    shadow-[var(--shadow-surface)] league-compact:hidden
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
  backButton: "min-h-9! justify-self-start! px-3! py-0!",
  autocomplete: `
    relative m-0 grid min-w-0 flex-[1.5_1_220px] gap-2 border-0 p-0
    [&>label]:text-[14px] [&>label]:font-semibold
    [&>label]:text-[var(--color-text-secondary)] league-mobile:w-full league-mobile:flex-none
  `,
  autocompleteControl: `
    flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-[var(--radius-md)] border
    border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 py-1
    focus-within:border-[var(--color-action-primary)]
    focus-within:shadow-[0_0_0_3px_var(--color-focus-ring)]
  `,
  suggestions: `
    absolute inset-x-0 top-[calc(100%+4px)] z-5 grid max-h-[220px] overflow-y-auto
    rounded-[var(--radius-md)] border border-[var(--color-border-default)]
    bg-[var(--color-bg-surface)] shadow-[var(--shadow-popover)]
  `,
  suggestion: `
    min-h-10 cursor-pointer border-0 bg-transparent px-3 py-2 text-left
    hover:bg-[var(--color-bg-subtle)] focus-visible:bg-[var(--color-bg-subtle)]
    focus-visible:outline-2 focus-visible:-outline-offset-2
    focus-visible:outline-[var(--color-action-primary)]
  `,
  filterField: `
    grid min-w-0 flex-[1_1_190px] gap-2 league-mobile:w-full league-mobile:flex-none
    [&>span]:flex [&>span]:items-center [&>span]:gap-1.5 [&>span]:text-[14px]
    [&>span]:font-semibold [&>span]:text-[var(--color-text-secondary)]
  `,
  cardFooter: `
    flex items-center justify-between league-compact:[&_.resource-actions-popover]:ml-auto
    league-compact:[&_.resource-actions-popover__trigger]:border!
    league-compact:[&_.resource-actions-popover__trigger]:border-[var(--color-action-primary)]!
    league-compact:[&_.resource-actions-popover__trigger]:text-[var(--color-text-success)]!
    league-compact:[&_.resource-actions-popover__trigger]:min-w-[104px]!
    league-compact:[&_.resource-actions-popover__icon]:hidden!
    league-compact:[&_.resource-actions-popover__mobile-label]:inline!
  `,
};

export { leagueStyles };
