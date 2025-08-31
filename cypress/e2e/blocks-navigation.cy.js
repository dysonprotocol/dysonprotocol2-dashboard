describe('Blocks Navigation', () => {
  it('navigates to blocks page and views the most recent block', () => {
    const consoleErrors = []
    
    cy.window().then((win) => {
      cy.stub(win.console, 'error').callsFake((...args) => {
        consoleErrors.push(args.join(' '))
      })
    })
    
    cy.visit('/')
    
    // Check that the page loads without errors
    cy.get('#app').should('exist')
    
    // Click on the "Blocks" navigation item (force click in case sidebar is collapsed)
    cy.contains('Blocks').click({ force: true })
    
    // Wait for the blocks page to load
    cy.url().should('include', 'blocks')
    
    // Assert blocks page has blocks
    cy.get('tbody tr').should('have.length.at.least', 1)
    
    // Get the highest block number (most recent block in first row)
    cy.get('tbody tr').first().find('.link-primary').then(($link) => {
      const blockHeight = $link.text().trim()
      cy.log(`Clicking on most recent block: ${blockHeight}`)
      cy.wrap($link).click()
    })
    
    // Check that we're on a block detail page
    cy.url().should('match', /\/block\/\d+/)
    
    // Wait for page to load and check for basic content
    cy.wait(2000)
    cy.get('h1').should('contain', 'Block')
    
    // Assert the page has no errors
    cy.get('.alert-error').should('not.exist')
    
    // Assert there are no console errors
    cy.then(() => {
      expect(consoleErrors).to.have.length(0, `Console errors found: ${consoleErrors.join('; ')}`)
    })
  })
})
