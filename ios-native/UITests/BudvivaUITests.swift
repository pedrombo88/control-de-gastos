import XCTest

/// La sesión simulada solo está disponible en el simulador.
/// No permite eludir la autenticación en un iPhone físico.
final class BudvivaUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testLoginIsRequiredWhenThereIsNoSession() throws {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.staticTexts["Bienvenido de nuevo."].waitForExistence(timeout: 15))
        XCTAssertTrue(app.textFields["auth-email"].exists)
        XCTAssertFalse(app.tabBars.buttons["Inicio"].exists,
                       "No debe mostrarse información financiera antes de iniciar sesión.")
    }

    @MainActor
    func testTabsAndSettingsAreReachable() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--budviva-ui-test"]
        app.launch()

        let pages: [(tab: String, navigationTitle: String, fileName: String)] = [
            ("Inicio", "Budviva", "01-Inicio"),
            ("Movimientos", "Movimientos", "02-Movimientos"),
            ("Presupuestos", "Presupuestos", "03-Presupuestos"),
            ("Ahorro", "Ahorro", "04-Ahorro"),
            ("Compartidos", "Compartidos", "05-Compartidos")
        ]
        for page in pages {
            let tab = app.tabBars.buttons[page.tab]
            XCTAssertTrue(tab.waitForExistence(timeout: 15), "Falta la pestaña \(page.tab)")
            tab.tap()
            XCTAssertTrue(app.navigationBars[page.navigationTitle].waitForExistence(timeout: 15),
                          "No se ha abierto la sección \(page.tab)")
            let capture = XCTAttachment(screenshot: app.screenshot())
            capture.name = page.fileName
            capture.lifetime = .keepAlways
            add(capture)
        }
        app.tabBars.buttons["Inicio"].tap()
        app.navigationBars["Budviva"].buttons["Ajustes"].tap()
        XCTAssertTrue(app.navigationBars["Ajustes"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.buttons["Cerrar sesión"].exists)
        XCTAssertTrue(app.buttons["Eliminar datos y documentos"].exists)
    }
}
