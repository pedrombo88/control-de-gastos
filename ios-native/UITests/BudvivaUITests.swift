import XCTest

/// Pruebas de navegación nativa sin credenciales ni datos reales.
/// Las capturas se adjuntan al XCResult del simulador de GitHub Actions.
final class BudvivaUITests: XCTestCase {
    @MainActor
    func testLoginGateOnFreshInstall() throws {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.textFields["budviva-login-email"].waitForExistence(timeout: 20))
        XCTAssertTrue(app.buttons["budviva-send-otp"].exists)
        XCTAssertFalse(app.buttons["budviva-tab-Compartidos"].exists)
        let shot = XCTAttachment(screenshot:app.screenshot())
        shot.name="00-Acceso-Budviva"
        shot.lifetime = .keepAlways
        add(shot)
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testSixTabsAreReachableAndCreateScreenshots() throws {
        let app = XCUIApplication()
        app.launchArguments += ["--budviva-ui-test-session"]
        app.launch()

        let pages: [(tab: String, navigationTitle: String, fileName: String)] = [
            ("Inicio", "Budviva", "01-Inicio"),
            ("Movimientos", "Movimientos", "02-Movimientos"),
            ("Presupuestos", "Presupuestos", "03-Presupuestos"),
            ("Ahorro", "Ahorro", "04-Ahorro"),
            ("Compartidos", "Compartidos", "05-Compartidos"),
            ("Ajustes", "Ajustes", "06-Ajustes")
        ]

        for page in pages {
            let tab = app.buttons["budviva-tab-\(page.tab)"]
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
        // SwiftUI Form materializa secciones de forma perezosa: el botón de
        // borrado puede estar fuera de pantalla y requiere desplazamiento.
        let eraseButton = app.buttons["Eliminar datos y documentos"]
        if !eraseButton.exists {
            for _ in 0..<5 {
                app.swipeUp()
                if eraseButton.exists { break }
            }
        }
        XCTAssertTrue(eraseButton.waitForExistence(timeout:5),
                      "La opción de borrar datos locales debe estar disponible")
    }
}
