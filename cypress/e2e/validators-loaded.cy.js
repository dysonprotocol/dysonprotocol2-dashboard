describe('Validators Loading', () => {
  it('should always load validators for any block', () => {
    cy.visit('/block/latest')
    
    // Wait for loading to complete
    cy.get('.loading', { timeout: 10000 }).should('not.exist')
    
    // Assert validators are loaded - should never be empty
    cy.get('[data-testid="validators-table"] tbody tr').should('have.length.greaterThan', 0)
    
    // Should not show "No validators loaded" message
    cy.contains('No validators loaded').should('not.exist')
  })
})
