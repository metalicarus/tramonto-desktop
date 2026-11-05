// src/utils/repository.js

/**
 * Pasta local do repositório do projeto, dentro de ~/.tramonto/repositories.
 * Projetos importados guardam o nome do repositório em settings.repoDir; os criados aqui
 * usam "<nome>-<id>" e passam a guardá-lo no primeiro sync, para que renomear o projeto
 * não crie uma pasta nova.
 */
export function projectRepoDir(project) {
  if (project.settings?.repoDir) return project.settings.repoDir
  const slug = (project.name || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  return slug ? `${slug}-${project.id}` : project.id
}
