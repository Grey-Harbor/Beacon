import type { ReactNode } from 'react';

export const projectSites = {
  Drift: 'https://drift.greyharborsoftware.com',
  Compactor: 'https://compactor.greyharborsoftware.com',
} as const;

export type ProjectName = keyof typeof projectSites;

export function ProjectLink({ name }: { name: ProjectName }) {
  return (
    <a className="project-link" href={projectSites[name]}>
      {name}
    </a>
  );
}

export function linkProjectNames(text: string): ReactNode {
  return text.split(/\b(Drift|Compactor)\b/).map((part, index) => {
    if (part === 'Drift' || part === 'Compactor') {
      return <ProjectLink key={`${part}-${index}`} name={part} />;
    }

    return part;
  });
}
