import XCTest

/// Pruebas de navegación nativa sin credenciales ni datos reales.
/// Las capturas se adjuntan al XCResult del simulador de GitHub Actions.
final class BudvivaUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testFiveTabsAreReachableAndCreateScreenshots() throws {
        let app = XCUIApplication()
        app.launch()

        let pages: [(tab: String, navigationTitle: String, fileName: String)] = [
            ("Inicio", "Budviva", "01-Inicio"),
            ("Movimientos", "Movimientos", "02-Movimientos"),
            ("Presupuestos", "Presupuestos", "03-Presupuestos"),
            ("Ahorro", "Ahorro", "04-Ahorro"),
            ("Ajustes", "Ajustes", "05-Ajustes")
        ]

        for page in pages {
            let tab = app.tabBars.buttons[page.tab]
            XCTAssertTrue(tab.waitForExistence(timeout: 15),
                          "Falta la pestaña nativa \(page.tab)")
            tab.tap()
            XCTAssertTrue(app.navigationBars[page.navigationTitle].waitForExistence(timeout: 15),
                          "No se ha abierto la sección \(page.tab)")

            let capture = XCTAttachment(screenshot: app.screenshot())
            capture.name = page.fileName
            capture.lifetime = .keepAlways
            add(capture)
        }

        // Los enlaces de privacidad y la acción de borrado deben estar accesibles
        // desde Ajustes; este test NO elimina ninguna información.
        XCTAssertTrue(
            app.staticTexts["Control de mis datos y cuenta"].waitForExistence(timeout: 10),
            "No se encuentra el control de datos personales"
        )
        XCTAssertTrue(
            app.buttons["Eliminar datos y documentos"].exists,
            "La opción de borrar datos locales debe estar disponible"
        )
    }
}
