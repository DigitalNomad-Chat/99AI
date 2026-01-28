import { defineStore } from 'pinia'
import { getLocalState, setLocalState, ARTICLE_KEY } from './helper'

export const useArticleStore = defineStore(ARTICLE_KEY, {
  state: (): ArticleStore => getLocalState(),

  getters: {
    articlesList: state => Object.values(state.articles),
    currentArticle: state => state.currentArticleId ? state.articles[state.currentArticleId] : null
  },

  actions: {
    addArticle(article: Omit<Article.Article, 'id' | 'createdAt' | 'updatedAt'>) {
      const id = `article_${Date.now()}`
      const now = new Date()
      const newArticle: Article.Article = {
        id,
        createdAt: now,
        updatedAt: now,
        ...article
      }
      this.articles[id] = newArticle
      this.currentArticleId = id
      setLocalState(this.$state)
      return newArticle
    },

    updateArticle(id: string, updates: Partial<Article.Article>) {
      if (this.articles[id]) {
        this.articles[id] = {
          ...this.articles[id],
          ...updates,
          updatedAt: new Date()
        }
        setLocalState(this.$state)
      }
    },

    deleteArticle(id: string) {
      delete this.articles[id]
      if (this.currentArticleId === id) {
        this.currentArticleId = null
      }
      setLocalState(this.$state)
    },

    setCurrentArticle(id: string | null) {
      this.currentArticleId = id
      setLocalState(this.$state)
    },

    getArticle(id: string) {
      return this.articles[id]
    }
  }
})
