const playerStyles = {
  container: "mx-auto grid max-w-[1180px] gap-6",
  formPage: `
    min-h-screen px-6 pt-8 pb-12 player-mobile:min-h-[calc(100vh-60px)] player-mobile:px-4
    player-mobile:pt-6 player-mobile:pb-8
  `,
  detailPage: `
    min-h-screen px-6 pt-10 pb-14 player-mobile:min-h-[calc(100vh-60px)]
    player-mobile:w-full player-mobile:px-4 player-mobile:pt-6 player-mobile:pb-8
  `,
  detailCard: `
    grid gap-6 rounded-[var(--radius-surface)] border border-[var(--color-border-default)]
    bg-[var(--color-bg-surface)] p-8 player-mobile:px-5 player-mobile:py-6
  `,
  formCard: `
    grid w-full gap-6 rounded-[var(--radius-surface)] border
    border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-6
    player-mobile:rounded-none player-mobile:border-x-0 player-mobile:px-4
    player-mobile:py-5
  `,
  formLayout: "grid min-w-0 gap-6",
  formFields: "grid gap-4",
  formTitle: "m-0 text-[24px]",
  description: "m-0 text-[var(--color-text-secondary)]",
  formActions:
    "flex justify-end player-mobile:w-full player-mobile:[&_.lucarne-button]:w-full!",
  select: `
    min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)]
    bg-[var(--color-bg-surface)] px-[10px] py-0 focus:border-[var(--color-action-primary)]
    focus:shadow-[0_0_0_3px_var(--color-focus-ring)] focus:outline-none
  `,
  nameLink: `
    font-bold text-[var(--color-text-primary)] underline underline-offset-[3px]
    focus-visible:outline-2 focus-visible:outline-offset-2
    focus-visible:outline-[var(--color-action-primary)]
  `,
  assignmentRow: `
    player-compact:block player-compact:border-b
    player-compact:border-[var(--color-border-default)] player-compact:py-3
  `,
  assignmentLabel: `
    player-compact:before:mb-1 player-compact:before:block
    player-compact:before:text-[13px] player-compact:before:font-bold
    player-compact:before:text-[var(--color-text-secondary)]
    player-compact:before:content-[attr(data-label)]
  `,
};

export { playerStyles };
