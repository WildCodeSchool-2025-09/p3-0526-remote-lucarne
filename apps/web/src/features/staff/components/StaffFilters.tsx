import type { ListStaffMembersParams, StaffMemberStatusFilter } from "@lucarne/shared";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import DashboardListFilters from "../../../components/dashboard/DashboardListFilters";
import { Button, Input, Select, temporaryIcons } from "../../../ui";

type SuggestionField = "staffMember" | "team";
type StaffSortField = "lastName" | "createdAt";

interface StaffFiltersProps {
  canCreate?: boolean;
  onChange: (changes: Partial<ListStaffMembersParams>) => void;
  onReset: () => void;
  params: ListStaffMembersParams;
  staffNames: string[];
  teamNames: string[];
}

function StaffAutocomplete({ ariaLabel, field, onChange, options, placeholder, value }: { ariaLabel: string; field: SuggestionField; onChange: (value: string) => void; options: string[]; placeholder: string; value: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const inputId = `staff-${field}-filter`;
  const suggestionsId = `staff-${field}-suggestions`;
  const SearchIcon = temporaryIcons.search;
  const suggestions = useMemo(() => {
    const search = value.trim().toLocaleLowerCase("fr");
    return [...new Set(options)].filter((option) => option.toLocaleLowerCase("fr").includes(search)).sort((left, right) => left.localeCompare(right, "fr"));
  }, [options, value]);

  return <div className="dashboard-list__field dashboard-list__autocomplete dashboard-list__field--name"><label htmlFor={inputId}>{ariaLabel}</label><div className="dashboard-list__autocomplete-control"><SearchIcon aria-hidden="true" className="dashboard-list__filter-icon" size={18} /><Input aria-autocomplete="list" aria-controls={isOpen ? suggestionsId : undefined} aria-expanded={isOpen} aria-label={ariaLabel} id={inputId} onBlur={() => window.setTimeout(() => setIsOpen(false), 0)} onChange={(event) => { setIsOpen(true); onChange(event.target.value); }} onFocus={() => setIsOpen(true)} onKeyDown={(event) => { if (event.key === "Enter" && suggestions[0] != null) { event.preventDefault(); onChange(suggestions[0]); setIsOpen(false); } }} placeholder={placeholder} type="search" value={value} /></div>{isOpen ? <div aria-label={`Suggestions de ${ariaLabel.toLocaleLowerCase("fr")}`} className="dashboard-list__suggestions" id={suggestionsId} role="listbox">{suggestions.length === 0 ? <span className="dashboard-list__suggestions-empty" role="status">Non disponible</span> : suggestions.map((option) => <button aria-selected={value === option} className="dashboard-list__suggestion" key={option} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option); setIsOpen(false); }} role="option" type="button">{option}</button>)}</div> : null}</div>;
}

function StaffFilters({ canCreate = false, onChange, onReset, params, staffNames, teamNames }: StaffFiltersProps) {
  const FilterIcon = temporaryIcons.filter;
  const activeCount = Number(Boolean(params.search)) + Number(Boolean(params.teamName)) + Number(params.status !== "ALL");

  return <DashboardListFilters activeCount={activeCount} label="Filtres du staff" mobileAction={canCreate ? <Link className="lucarne-button lucarne-button--primary lucarne-button--xl dashboard-list__mobile-create" to="/dashboard/staff-members/new">Ajouter un membre du staff</Link> : undefined}>
    <StaffAutocomplete ariaLabel="Rechercher un membre du staff" field="staffMember" onChange={(value) => onChange({ search: value })} options={staffNames} placeholder="Saisir un nom" value={params.search ?? ""} />
    <StaffAutocomplete ariaLabel="Équipe" field="team" onChange={(value) => onChange({ teamName: value })} options={teamNames} placeholder="Saisir une équipe" value={params.teamName ?? ""} />
    <label className="dashboard-list__field dashboard-list__field--status"><span><FilterIcon aria-hidden="true" size={16} />Statut</span><Select aria-label="Filtrer par statut" onChange={(event) => onChange({ status: event.target.value as StaffMemberStatusFilter })} value={params.status}><option value="ALL">Tous</option><option value="ACTIVE">Actifs</option><option value="INACTIVE">Inactifs</option></Select></label>
    <label className="dashboard-list__field dashboard-list__field--sort"><span>Tri</span><Select aria-label="Trier les membres du staff" onChange={(event) => { const [sortBy, sortOrder] = event.target.value.split(":"); onChange({ sortBy: sortBy as StaffSortField, sortOrder: sortOrder as "asc" | "desc" }); }} value={`${params.sortBy}:${params.sortOrder}`}><option value="lastName:asc">Nom : A à Z</option><option value="lastName:desc">Nom : Z à A</option><option value="createdAt:asc">Date de création : croissante</option><option value="createdAt:desc">Date de création : décroissante</option></Select></label>
    <Button className="dashboard-list__reset" onClick={onReset} variant="outline">Réinitialiser</Button>
  </DashboardListFilters>;
}

export default StaffFilters;
