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
        XCTAssertTrue(app.buttons["budviva-guest-entry"].exists)
        XCTAssertFalse(app.buttons["budviva-tab-Compartidos"].exists)
        let shot = XCTAttachment(screenshot:app.screenshot())
        shot.name="00-Acceso-Budviva"
        shot.lifetime = .keepAlways
        add(shot)
    }

    @MainActor
    func testGuestCanOpenLocalSectionsWithoutAccount() throws {
        let app=XCUIApplication()
        app.launch()
        let guest=app.buttons["budviva-guest-entry"]
        XCTAssertTrue(guest.waitForExistence(timeout:20))
        guest.tap()
        XCTAssertTrue(app.buttons["budviva-tab-Inicio"].waitForExistence(timeout:15))
        XCTAssertTrue(app.buttons["budviva-tab-Compartidos"].exists)
        app.buttons["budviva-tab-Ajustes"].tap()
        XCTAssertTrue(app.buttons["Iniciar sesión o crear cuenta"].waitForExistence(timeout:10))
    }


    @MainActor
    func testReceiptGalleryPickerIsAvailableAlongsideCameraAndFiles() throws {
        let app=XCUIApplication()
        app.launchArguments += ["--budviva-ui-test-session"]
        app.launch()
        let movements=app.buttons["budviva-tab-Movimientos"]
        XCTAssertTrue(movements.waitForExistence(timeout:15))
        movements.tap()
        let importButton=app.buttons["Importar"].firstMatch
        XCTAssertTrue(importButton.waitForExistence(timeout:10))
        importButton.tap()
        XCTAssertTrue(app.buttons["budviva-gallery-picker"].waitForExistence(timeout:10),
                      "Falta la opción para escoger fotos directamente de la galería")
        XCTAssertTrue(app.buttons["Hacer foto del ticket"].exists,
                      "La opción de hacer una foto debe mantenerse")
        XCTAssertTrue(app.buttons["Seleccionar documento"].exists,
                      "La opción de importar desde Archivos debe mantenerse")
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

        // La eliminación de cuenta debe ser visible directamente desde Ajustes.
        XCTAssertTrue(
            app.buttons["budviva-delete-account"].waitForExistence(timeout:10),
            "Debe existir el acceso nativo a eliminación de cuenta"
        )
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
