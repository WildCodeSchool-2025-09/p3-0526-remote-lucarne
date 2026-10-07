const dashboardStyles = {
  page: `
    min-h-screen px-6 pt-10 pb-14 dashboard-mobile:min-h-[calc(100vh-60px)]
    dashboard-mobile:w-full dashboard-mobile:px-4 dashboard-mobile:pt-6 dashboard-mobile:pb-8
  `,
  container: "mx-auto grid max-w-[1180px] gap-6",
  layout: "flex min-h-screen w-full dashboard-mobile:block",
  main: "min-h-screen dashboard-mobile:min-h-[calc(100vh-60px)]",
  sidebar: `
    flex min-h-screen flex-[0_0_260px] flex-col bg-[var(--color-bg-dashboard-navigation)]
    px-[18px] py-7 text-[var(--color-bg-surface)] dashboard-mobile:hidden
    dashboard-tablet:basis-[72px] dashboard-tablet:px-2.5 dashboard-tablet:py-5
  `,
  brand: `
    mb-8 flex h-14 items-center justify-start px-1 py-0
    dashboard-tablet:mb-7 dashboard-tablet:justify-center dashboard-tablet:p-0
  `,
  sidebarLogo: "block h-auto w-full max-w-[170px] dashboard-tablet:hidden",
  sidebarMark:
    "hidden dashboard-tablet:block dashboard-tablet:size-10 dashboard-tablet:object-contain",
  navigationLink: `
    flex min-h-[38px] items-center gap-3 rounded-[var(--radius-button)] px-4 py-0
    no-underline focus-visible:outline-2 focus-visible:outline-offset-2
    focus-visible:outline-[var(--color-bg-surface)]
    dashboard-tablet:justify-center dashboard-tablet:px-3 dashboard-tablet:[&_span]:hidden
  `,
  activeLink:
    "bg-[var(--color-action-primary)] font-bold text-[var(--color-text-on-primary)]",
  inactiveLink: `
    text-[#9aaab6] hover:bg-[rgb(255_255_255/8%)] hover:text-[var(--color-bg-surface)]
    focus-visible:bg-[rgb(255_255_255/8%)] focus-visible:text-[var(--color-bg-surface)]
  `,
  mobileHeader: `
    hidden dashboard-mobile:grid dashboard-mobile:min-h-[60px]
    dashboard-mobile:grid-cols-[44px_1fr_72px] dashboard-mobile:items-center
    dashboard-mobile:overflow-hidden dashboard-mobile:bg-[var(--color-bg-dashboard-navigation)]
    dashboard-mobile:px-3 dashboard-mobile:py-0 dashboard-mobile:text-[var(--color-bg-surface)]
    dashboard-mobile:[transition:max-height_220ms_ease] motion-reduce:transition-none!
  `,
  menuButton: `
    inline-flex size-10 cursor-pointer items-center justify-center border-0
    bg-transparent p-0 text-inherit focus-visible:outline-2 focus-visible:outline-offset-2
    focus-visible:outline-[var(--color-bg-surface)]
  `,
  mobileLogo: "block h-auto w-full max-w-[140px] justify-self-center",
  mobileNavigation: `
    hidden dashboard-mobile:block dashboard-mobile:col-span-full
    dashboard-mobile:origin-top dashboard-mobile:overflow-hidden
    dashboard-mobile:[transition:max-height_220ms_ease,opacity_160ms_ease,transform_220ms_ease]
    motion-reduce:transition-none! [&>nav]:px-1 [&>nav]:pt-3 [&>nav]:pb-4
    [&_a]:min-h-[42px] [&_a]:justify-center
  `,
  mobileNavigationOpen:
    "dashboard-mobile:max-h-[520px] dashboard-mobile:opacity-100 dashboard-mobile:[transform:scaleY(1)]",
  mobileNavigationClosed:
    "dashboard-mobile:max-h-0 dashboard-mobile:opacity-0 dashboard-mobile:[transform:scaleY(0)]",
  pageHeader: `
    flex justify-between [&>div]:min-w-0 dashboard-mobile:flex-col
    dashboard-mobile:items-start dashboard-mobile:gap-4
  `,
  title: `
    m-0 flex flex-wrap items-center gap-2.5 text-[32px] font-extrabold
    [overflow-wrap:anywhere] dashboard-mobile:text-[28px]
  `,
  description: "mt-2 mb-0 text-[var(--color-text-secondary)]",
  titleIcon: "text-[var(--color-action-primary)] dashboard-mobile:hidden",
  count: `
    inline-flex items-center rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-[5px]
    text-[13px] font-bold whitespace-nowrap text-[var(--color-text-secondary)]
  `,
  createLink: `
    lucarne-button lucarne-button--primary lucarne-button--xl ml-auto min-w-[180px]
    flex-none whitespace-nowrap dashboard-mobile:hidden!
  `,
  breadcrumb: `
    m-0 mb-2 flex list-none flex-wrap gap-1.5 p-0 text-[13px]
    text-[var(--color-text-secondary)] [overflow-wrap:anywhere]
    [&_li+li]:before:mr-1.5 [&_li+li]:before:content-['/']
    [&_strong]:text-[var(--color-text-primary)]
  `,
  filters: `
    flex flex-wrap items-end gap-4 rounded-[var(--radius-surface)] border
    border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5
    dashboard-mobile:flex-col dashboard-mobile:items-stretch dashboard-mobile:p-4
  `,
  filtersToggle: `
    hidden dashboard-mobile:flex dashboard-mobile:min-h-11 dashboard-mobile:w-full
    dashboard-mobile:cursor-pointer dashboard-mobile:items-center
    dashboard-mobile:justify-between dashboard-mobile:border-0 dashboard-mobile:bg-transparent
    dashboard-mobile:p-0 dashboard-mobile:[font:inherit] dashboard-mobile:font-bold!
    dashboard-mobile:text-[var(--color-text-primary)]
    dashboard-mobile:focus-visible:rounded-[var(--radius-button)]
    dashboard-mobile:focus-visible:outline-2 dashboard-mobile:focus-visible:outline-offset-4
    dashboard-mobile:focus-visible:outline-[var(--color-focus-ring)]
  `,
  filtersChevron:
    "dashboard-mobile:transition-transform dashboard-mobile:duration-[160ms] dashboard-mobile:ease-[ease] motion-reduce:transition-none!",
  filtersBodyOpen:
    "contents dashboard-mobile:flex dashboard-mobile:flex-col dashboard-mobile:gap-4",
  filtersBodyClosed: "contents dashboard-mobile:hidden",
};

export { dashboardStyles };
