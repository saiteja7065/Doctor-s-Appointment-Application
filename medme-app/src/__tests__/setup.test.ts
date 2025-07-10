describe('Test Setup', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have Jest environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })

  it('should have access to testing utilities', () => {
    expect(global.ResizeObserver).toBeDefined()
    expect(global.IntersectionObserver).toBeDefined()
  })
})
