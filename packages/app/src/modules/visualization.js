import options from './options'

export const getVisualizationFromCurrent = current => {
    const nonSavableOptions = Object.keys(options).filter(
        option => !options[option].savable
    )

    nonSavableOptions.forEach(option => delete current[option])

    return current
}
