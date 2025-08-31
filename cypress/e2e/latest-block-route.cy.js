describe('Latest Block Route', () => {
  it('renders /block/latest page with proper content', () => {
    const consoleErrors = []
    
    cy.window().then((win) => {
      cy.stub(win.console, 'error').callsFake((...args) => {
        consoleErrors.push(args.join(' '))
      })
    })
    
    cy.visit('/block/latest')
    
    // URL should stay as /block/latest
    cy.url().should('include', '/block/latest')
    
    // Wait for loading to disappear and content to appear
    cy.get('.loading', { timeout: 10000 }).should('not.exist')
    
    // Verify the page actually loads block data with numeric height
    cy.get('h1').should('exist').and(($h1) => {
      const text = $h1.text()
      expect(text, `Expected "Block {number}" but got "${text}"`).to.match(/Block \d+/)
    })
    
    // Wait for loading to disappear and content to appear
    cy.get('.loading', { timeout: 10000 }).should('not.exist')
    
    // Verify block header data is displayed
    cy.contains('Header').should('be.visible')
    cy.contains('Time').should('be.visible')
    cy.contains('Proposer').should('be.visible')
    cy.contains('Block Hash').should('be.visible')
    
    // Verify transactions section exists
    cy.contains('Transactions').scrollIntoView().should('be.visible')
    
    // Verify validators section exists (scroll into view first)
    cy.contains('Validators').scrollIntoView().should('be.visible')
    
    // Verify no error alerts
    cy.get('.alert-error').should('not.exist')
    
    // Assert there are no console errors
    cy.then(() => {
      expect(consoleErrors).to.have.length(0, `Console errors found: ${consoleErrors.join('; ')}`)
    })
  })
})
