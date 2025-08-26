/* empty css   */ import e from "https://cdn.jsdelivr.net/npm/zod/+esm"
;(function () {
    const t = document.createElement("link").relList
    if (t && t.supports && t.supports("modulepreload")) return
    for (const a of document.querySelectorAll('link[rel="modulepreload"]')) s(a)
    new MutationObserver((a) => {
        for (const o of a)
            if (o.type === "childList")
                for (const n of o.addedNodes)
                    n.tagName === "LINK" && n.rel === "modulepreload" && s(n)
    }).observe(document, { childList: !0, subtree: !0 })
    function i(a) {
        const o = {}
        return (
            a.integrity && (o.integrity = a.integrity),
            a.referrerPolicy && (o.referrerPolicy = a.referrerPolicy),
            a.crossOrigin === "use-credentials"
                ? (o.credentials = "include")
                : a.crossOrigin === "anonymous"
                  ? (o.credentials = "omit")
                  : (o.credentials = "same-origin"),
            o
        )
    }
    function s(a) {
        if (a.ep) return
        a.ep = !0
        const o = i(a)
        fetch(a.href, o)
    }
})()
window.useFormFormValidator = () => {
    const r = e.object({
            firstName: e
                .string("Please enter your first name")
                .min(2, "First name must be at least 2 characters long"),
            lastName: e
                .string("Please enter your last name")
                .min(2, "Last name must be at least 2 characters long"),
            username: e
                .string("Please enter your username")
                .min(2, "Username must be at least 2 characters long"),
            email: e.email("Invalid email address"),
            phoneNumber: e
                .string("Phone number is invalid")
                .regex(/^[0-9]{10}$/, "Phone number must be 10 digits long"),
            dob: e.iso.date("Invalid date of birth"),
        }),
        t = {
            firstName: "",
            lastName: "",
            username: "",
            email: "",
            phoneNumber: "",
            dob: new Date().toLocaleString(),
        }
    return createFormValidator(r, t)
}
window.useTextFormValidator = () => {
    const r = e.object({
            optionalText: e.string().optional(),
            minimumText: e.string().min(3, "Text must be at least 3 characters"),
            maximumText: e.string().max(5, "Text must be at max 5 characters"),
        }),
        t = { optionalText: "", minimumText: "12", maximumText: "123456" }
    return createFormValidator(r, t)
}
window.useNumberValidator = () => {
    const r = e.object({
            optionalNumber: e.preprocess((i) => (i === "" ? void 0 : i), e.number().optional()),
            minimumNumber: e.number().min(18, "You must be at least 18"),
            maximumNumber: e.number().max(99, "You must be at maximum 99"),
        }),
        t = { optionalNumber: "", minimumNumber: 17, maximumNumber: 100 }
    return createFormValidator(r, t)
}
window.useEmailFormValidator = () => {
    const r = e.object({
            requiredEmail: e.email("Invalid email address"),
            optionalEmail: e.preprocess(
                (i) => (i === "" ? void 0 : i),
                e.email("Invalid email address").optional()
            ),
        }),
        t = { optionalEmail: "", requiredEmail: "" }
    return createFormValidator(r, t)
}
window.useRadioFormValidator = () => {
    const r = e.object({
            requiredRadio: e.enum(["male", "female", "other"], { message: "Select gender" }),
        }),
        t = { requiredRadio: "" }
    return createFormValidator(r, t)
}
window.useCheckboxFormValidator = () => {
    const r = e.object({
            requiredCheckbox: e.boolean().refine((i) => i, { message: "Accept terms to continue" }),
        }),
        t = { requiredCheckbox: !1 }
    return createFormValidator(r, t)
}
window.useToggleFormValidator = () => {
    const r = e.object({
            requiredToggle: e.boolean().refine((i) => i, { message: "Accept terms to continue" }),
        }),
        t = { requiredToggle: !1 }
    return createFormValidator(r, t)
}
window.useSelectFormValidator = () => {
    const r = e.object({ requiredSelect: e.string().min(1, "Select a country") }),
        t = { requiredSelect: "" }
    return createFormValidator(r, t)
}
window.useRangeFormValidator = () => {
    const r = e.object({
            betweenNumber: e
                .number()
                .min(20, "You must be at least 20")
                .max(80, "You must be at maximum 80"),
        }),
        t = { betweenNumber: 15 }
    return createFormValidator(r, t)
}
window.useRatingsFormValidator = () => {
    const r = e.object({
            requiredRating: e.preprocess(
                (i) => (i === void 0 ? void 0 : parseInt(i)),
                e.number("Please select a rating").min(1, "Please select a rating")
            ),
        }),
        t = { requiredRating: 0 }
    return createFormValidator(r, t)
}
