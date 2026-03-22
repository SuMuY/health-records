import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/clients' },
    { path: '/clients', component: () => import('../views/ClientListView.vue'), meta: { tab: 'clients' } },
    { path: '/clients/new', component: () => import('../views/ClientEditView.vue'), meta: { tab: 'clients' } },
    { path: '/clients/:id', component: () => import('../views/ClientDetailView.vue'), meta: { tab: 'clients' } },
    { path: '/clients/:id/edit', component: () => import('../views/ClientEditView.vue'), meta: { tab: 'clients' } },
    { path: '/clients/:clientId/records/new', component: () => import('../views/RecordCreateView.vue') },
    { path: '/clients/:clientId/records/:recordId', component: () => import('../views/RecordDetailView.vue') },
    { path: '/clients/:clientId/records/:recordId/edit', component: () => import('../views/RecordEditView.vue') },
    { path: '/templates', component: () => import('../views/TemplateListView.vue'), meta: { tab: 'templates' } },
    { path: '/templates/new', component: () => import('../views/TemplateEditView.vue'), meta: { tab: 'templates' } },
    { path: '/templates/:id/edit', component: () => import('../views/TemplateEditView.vue'), meta: { tab: 'templates' } },
  ],
})

export default router
