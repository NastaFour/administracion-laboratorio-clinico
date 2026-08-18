export function useMask() {
    const maskCedula = (value: string) => {
        return value.replace(/\D/g, '').slice(0, 10)
    }

    const maskPhone = (value: string) => {
        const v = value.replace(/\D/g, '')
        if (v.length <= 4) return v
        if (v.length <= 11) return `${v.slice(0, 4)}-${v.slice(4)}`
        return `${v.slice(0, 4)}-${v.slice(4, 11)}`
    }

    return { maskCedula, maskPhone }
}
