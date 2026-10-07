const teamStyles = {
  container: "mx-auto grid max-w-[1180px] gap-6",
  formPage: `
    min-h-screen px-6 pt-8 pb-12 team-mobile:min-h-[calc(100vh-60px)] team-mobile:px-4
    team-mobile:pt-6 team-mobile:pb-8
  `,
  detailPage: `
    min-h-screen px-6 pt-10 pb-14 team-mobile:min-h-[calc(100vh-60px)]
    team-mobile:w-full team-mobile:px-4 team-mobile:pt-6 team-mobile:pb-8
  `,
  detailCard: `
    grid gap-6 rounded-[var(--radius-surface)] border border-[var(--color-border-default)]
    bg-[var(--color-bg-surface)] p-8 team-mobile:px-5 team-mobile:py-6
  `,
  formCard: `
    grid w-full gap-6 rounded-[var(--radius-surface)] border
    border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-6
    team-mobile:rounded-none team-mobile:border-x-0 team-mobile:px-4
    team-mobile:py-5
  `,
  formFields: "grid gap-4",
  formTitle: "m-0 text-[24px]",
  description: "m-0 text-[var(--color-text-secondary)]",
  formActions:
    "flex justify-end team-mobile:w-full team-mobile:[&_.lucarne-button]:w-full!",
  nameLink: `
    font-bold text-[var(--color-text-primary)] underline underline-offset-[3px]
    focus-visible:outline-2 focus-visible:outline-offset-2
    focus-visible:outline-[var(--color-action-primary)]
  `,
  rosterTable: `
    w-full border-collapse team-compact:block [&_th]:border-b
    [&_th]:border-[var(--color-border-default)] [&_th]:p-3 [&_th]:text-left
    [&_th]:align-middle [&_td]:border-b [&_td]:border-[var(--color-border-default)]
    [&_td]:p-3 [&_td]:text-left [&_td]:align-middle [&_td]:[overflow-wrap:anywhere]
    team-compact:[&_td]:block team-compact:[&_td]:border-0
  `,
  rosterRow: `
    team-compact:block team-compact:border-b
    team-compact:border-[var(--color-border-default)] team-compact:py-3
  `,
  rosterLabel: `
    team-compact:before:mb-1 team-compact:before:block
    team-compact:before:text-[13px] team-compact:before:font-bold
    team-compact:before:text-[var(--color-text-secondary)]
    team-compact:before:content-[attr(data-label)]
  `,
};

export { teamStyles };
