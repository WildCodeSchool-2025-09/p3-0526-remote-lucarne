const staffStyles = {
  container: "mx-auto grid max-w-[1180px] gap-6",
  formPage: `
    min-h-screen px-6 pt-8 pb-12 staff-mobile:min-h-[calc(100vh-60px)] staff-mobile:px-4
    staff-mobile:pt-6 staff-mobile:pb-8
  `,
  detailPage: `
    min-h-screen px-6 pt-10 pb-14 staff-mobile:min-h-[calc(100vh-60px)]
    staff-mobile:w-full staff-mobile:px-4 staff-mobile:pt-6 staff-mobile:pb-8
  `,
  detailCard: `
    grid gap-6 rounded-[var(--radius-surface)] border border-[var(--color-border-default)]
    bg-[var(--color-bg-surface)] p-8 staff-mobile:px-5 staff-mobile:py-6
  `,
  formCard: `
    grid w-full gap-6 rounded-[var(--radius-surface)] border
    border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-6
    staff-mobile:rounded-none staff-mobile:border-x-0 staff-mobile:px-4
    staff-mobile:py-5
  `,
  formFields: "grid gap-4",
  formTitle: "m-0 text-[24px]",
  description: "m-0 text-[var(--color-text-secondary)]",
  formActions:
    "flex justify-end staff-mobile:w-full staff-mobile:[&_.lucarne-button]:w-full!",
  nameLink: `
    font-bold text-[var(--color-text-primary)] underline underline-offset-[3px]
    focus-visible:outline-2 focus-visible:outline-offset-2
    focus-visible:outline-[var(--color-action-primary)]
  `,
  select: `
    min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)]
    bg-[var(--color-bg-surface)] px-[10px] py-0 focus:border-[var(--color-action-primary)]
    focus:shadow-[0_0_0_3px_var(--color-focus-ring)] focus:outline-none
  `,
};

export { staffStyles };
