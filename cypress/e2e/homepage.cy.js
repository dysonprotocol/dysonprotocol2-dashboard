describe('Homepage', () => {
  it('loads the main application', () => {
    cy.visit('/')
    
    // Check that the page loads with the expected title
    cy.title().should('eq', 'Dyson Protocol Dashboard')
    
    // Check that the main app div exists
    cy.get('#app').should('exist')
    
    // Check for key layout elements
    cy.get('#layout-content').should('exist')
    cy.get('#layout-sidebar-toggle-trigger').should('exist')
  })

  it('has the expected page structure', () => {
    cy.visit('/')
    
    // Check that the main layout is present
    cy.get('.h-screen').should('exist')
    
    // Verify the sidebar and content areas
    cy.get('#layout-content').should('be.visible')
  })
})
