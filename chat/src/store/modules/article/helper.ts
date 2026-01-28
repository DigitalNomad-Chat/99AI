export const ARTICLE_KEY = 'articleStore'

export interface ArticleStorage {
  articles: Record<string, Article.Article>
  currentArticleId: string | null
}

export function getLocalState(): ArticleStorage {
  const storage = localStorage.getItem(ARTICLE_KEY)
  if (storage) {
    try {
      return JSON.parse(storage)
    } catch {
      return {
        articles: {},
        currentArticleId: null,
      }
    }
  }
  return {
    articles: {},
    currentArticleId: null,
  }
}

export function setLocalState(state: ArticleStorage) {
  localStorage.setItem(ARTICLE_KEY, JSON.stringify(state))
}
