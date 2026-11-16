const publicStyles = {
  layout: "flex min-h-screen w-full dashboard-mobile:block",
  content: "min-w-0 flex-auto",
  main: "min-h-screen focus:outline-none dashboard-mobile:min-h-[calc(100vh-60px)]",
  skipLink: `
    sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50
    focus:rounded-[var(--radius-button)] focus:bg-[var(--color-bg-surface)]
    focus:px-4 focus:py-3 focus:text-[var(--color-text-primary)]
    focus:outline-2 focus:outline-[var(--color-focus-ring)]
  `,
  sidebar: `
    flex min-h-screen flex-[0_0_260px] flex-col bg-[var(--color-bg-dashboard-navigation)]
    px-[18px] py-7 text-[var(--color-bg-surface)]
    dashboard-tablet:basis-[72px] dashboard-tablet:px-2.5 dashboard-tablet:py-5
  `,
  brand: `
    mb-8 flex h-14 items-center rounded-[var(--radius-button)] px-1
    focus-visible:outline-2 focus-visible:outline-offset-2
    focus-visible:outline-[var(--color-bg-surface)]
    dashboard-tablet:mb-7 dashboard-tablet:justify-center dashboard-tablet:p-0
  `,
  fullLogo: "block h-auto w-full max-w-[170px]",
  compactLogo: "size-10 object-contain",
  list: "m-0 grid list-none gap-1.5 p-0",
  navigationItem: `
    flex min-h-[44px] w-full items-center gap-3 rounded-[var(--radius-button)]
    border-0 px-4 py-2 text-left text-[15px] no-underline
    focus-visible:outline-2 focus-visible:outline-offset-2
    focus-visible:outline-[var(--color-bg-surface)]
  `,
  compactItem: "justify-center px-3",
  activeItem: "bg-[var(--color-action-primary)] font-bold text-[var(--color-text-on-primary)]",
  inactiveItem: `
    bg-transparent text-[#9aaab6] hover:bg-[rgb(255_255_255/8%)]
    hover:text-[var(--color-bg-surface)] focus-visible:bg-[rgb(255_255_255/8%)]
    focus-visible:text-[var(--color-bg-surface)]
  `,
  unavailableItem: "cursor-not-allowed bg-transparent text-[#9aaab6]",
  label: "min-w-0 flex-1 [overflow-wrap:anywhere]",
  hint: "m-0 text-xs leading-relaxed text-[#9aaab6]",
  leaguePanel: "mt-2 max-h-[40dvh] overflow-y-auto border-l border-[#526472] py-1 pl-2 pr-1",
  compactLeagueList: "mt-2 max-h-[40dvh] overflow-y-auto py-1 text-center",
  leagueList: "m-0 grid list-none gap-1 p-0",
  leagueItem: "gap-2! px-2! text-sm!",
  compactLeagueItem: "size-11! justify-center px-0!",
  accounts: "mt-auto grid gap-3 border-t border-[#526472] pt-4",
  headerAccount: "justify-self-end",
  accountButton: "w-full gap-2 [overflow-wrap:anywhere]",
  compactAccountButton: "size-11! px-0!",
  mobileHeader: `
    grid min-h-[60px] grid-cols-[44px_1fr_44px] items-center
    bg-[var(--color-bg-dashboard-navigation)] px-3 text-[var(--color-bg-surface)]
  `,
  menuButton: `
    inline-flex size-11 cursor-pointer items-center justify-center rounded-[var(--radius-button)]
    border-0 bg-transparent p-0 text-inherit focus-visible:outline-2
    focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bg-surface)]
  `,
  mobileBrand: `
    justify-self-center rounded-[var(--radius-button)] focus-visible:outline-2
    focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bg-surface)]
  `,
  mobileLogo: "block h-auto w-[140px] max-w-full",
  mobilePanel: "col-span-full max-h-[calc(100dvh-60px)] overflow-y-auto py-4 [&_nav]:mb-6",
  page: "mx-auto max-w-[1120px] px-6 pt-8 pb-12 dashboard-mobile:px-4",
};

export { publicStyles };
