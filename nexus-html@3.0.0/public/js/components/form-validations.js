const createFormValidator = (schema, initialData = {}) => {
    const data = Alpine.reactive(initialData)
    const errors = Alpine.reactive({})

    const updateData = (name, value) => {
        data[name] = value
        validateField(name)
        console.info(name, value)
    }

    const setError = (name, error) => {
        if (error === null) {
            delete errors[name]
        } else {
            errors[name] = error
        }
    }

    const hasError = (name) => {
        return errors[name] !== undefined
    }

    const getError = (name) => {
        return errors[name]
    }

    const getData = (name) => {
        return data[name]
    }

    function validateField(name) {
        if (!name || !schema.shape.hasOwnProperty(name)) return

        const partialSchema = schema.pick({ [name]: true })
        const result = partialSchema.safeParse({ [name]: data[name] })

        if (result.success) {
            setError(name, null)
        } else {
            setError(name, result.error.issues[0].message)
        }
    }

    function handleSubmit(callback) {
        const res = schema.safeParse(data)
        if (!res.success) {
            res.error.issues.forEach((issue) => setError(issue.path[0], issue.message))
        } else {
            callback?.(res.data)
        }
    }

    return {
        errors,
        getData,
        updateData,
        hasError,
        getError,
        onSubmit: handleSubmit,
    }
}
