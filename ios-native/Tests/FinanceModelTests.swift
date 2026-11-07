import XCTest
@testable import Budviva

final class FinanceModelTests: XCTestCase {
    func testSharedExpensesEntryPointsToSecureOfficialPageWithoutPrivateData() {
        let shared=SharedExpensesService.url
        XCTAssertEqual(shared.scheme, "https")
        XCTAssertEqual(shared.host, "pedrombo88.github.io")
        XCTAssertEqual(shared.path, "/control-de-gastos/compartidos.html")
        XCTAssertNil(shared.query)
        XCTAssertNil(shared.user)
        XCTAssertNil(shared.password)

        let privacy=SharedExpensesService.privacyURL
        XCTAssertEqual(privacy.scheme, "https")
        XCTAssertEqual(privacy.host, shared.host)
        XCTAssertEqual(privacy.path, "/control-de-gastos/datos-y-privacidad.html")
        XCTAssertNil(privacy.query)
    }

    func testEuroAmountsUseIntegerCents() {
        XCTAssertEqual(FinanceFormat.cents("1,25"),125)
        XCTAssertEqual(FinanceFormat.cents("1.234,56"),123456)
        XCTAssertEqual(FinanceFormat.cents("1234.56"),123456)
        XCTAssertEqual(FinanceFormat.cents("1.000"),100000)
        XCTAssertNil(FinanceFormat.cents("-20"))
        XCTAssertNil(FinanceFormat.cents("0"))
        XCTAssertNil(FinanceFormat.cents("abc"))
    }

    func testLegacyReceiptWithoutProductIDIsDecodable() throws {
        let json = """
        {
          "version":2,
          "transactions":[
            {
              "id":"old-1","type":"expense","date":"2026-11-04",
              "title":"Tienda","amount":1550,"category":"alimentacion",
              "receiptItems":[{"name":"Pan","amount":250,"necessity":"necessary"}]
            }
          ]
        }
        """
        let backup=try JSONDecoder().decode(FinanceData.self,from:Data(json.utf8))
        XCTAssertEqual(backup.transactions.count,1)
        XCTAssertEqual(backup.transactions[0].receiptItems?.first?.name,"Pan")
        XCTAssertEqual(backup.transactions[0].receiptItems?.first?.amount,250)
        XCTAssertFalse(backup.transactions[0].receiptItems?.first?.id.isEmpty ?? true)
        XCTAssertTrue(backup.savingsGoals.isEmpty)
    }

    func testSavingsAreNotCountedAsTransactions() {
        let goal = SavingsGoal(title:"Vacaciones",target:300000,
                               dueDate:"2027-11-04",createdAt:"2026-11-04",
                               contributions:[GoalContribution(amount:10000,date:"2026-11-04")])
        XCTAssertEqual(goal.saved,10000)
        XCTAssertEqual(goal.remaining,290000)
        XCTAssertEqual(goal.fraction,1.0/30.0,accuracy:0.00001)
    }

    func testEncryptedBackupAuthenticatesData() throws {
        let input=Data("{\"version\":2,\"transactions\":[]}".utf8)
        let password="una contraseña suficientemente larga"
        let secret=try BackupCipher.encrypt(input,password:password)
        XCTAssertNotEqual(input,secret)
        XCTAssertEqual(try BackupCipher.decrypt(secret,password:password),input)
        XCTAssertThrowsError(try BackupCipher.decrypt(secret,password:"clave equivocada segura"))
    }

    func testCSVLineParserRespectsQuotes() {
        let line="04/11/2026;\"Tienda; centro\";-21,30"
        let pieces=NativeImportParser.csvCells(line,delimiter:";")
        XCTAssertEqual(pieces.count,3)
        XCTAssertEqual(pieces[1],"Tienda; centro")
    }

    func testDecryptsWebCompatibleKnownVector() throws {
        let fixture = #"{"format":"budviva-encrypted-v1","kdf":"PBKDF2-SHA256","iterations":310000,"salt":"AAECAwQFBgcICQoLDA0ODw==","iv":"EBESExQVFhcYGRob","ciphertext":"5d/og+JY4wyY7vlyf4G8VRGqYMR/0jDZlKOOBH0EBwSqNGpHzsNu2SfHU3B8Fzv901lZGgRCcqQZhhzY"}"#
        let value=try BackupCipher.decrypt(Data(fixture.utf8),password:"Budviva-test-contraseña-2026")
        XCTAssertEqual(String(data:value,encoding:.utf8),#"{"version":2,"transactions":[],"budgets":{}}"#)
    }

    @MainActor
    func testLegacyBackupClearsOrphanedOriginalReferences() throws {
        let legacy = """
        {
          "version":2,
          "transactions":[
            {"id":"legacy-ref-1","type":"expense","date":"2026-11-04",
             "title":"Compra antigua","amount":1250,"category":"otros",
             "sourceDocumentIds":["missing-original"]}
          ]
        }
        """
        let store=FinanceStore()
        try store.restoreBackup(Data(legacy.utf8))
        XCTAssertEqual(store.data.transactions.count,1)
        XCTAssertNil(store.data.transactions.first?.sourceDocumentIds)
        let exported=try JSONDecoder().decode(FinanceData.self,from:store.exportBackup())
        XCTAssertEqual(exported.attachments?.count,0)
        try store.wipe()
    }

    @MainActor
    func testMalformedFullBackupDoesNotReplaceExistingState() throws {
        let store=FinanceStore()
        let initial=store.data.transactions.count
        let malformed = """
        {
          "version":2,
          "transactions":[
            {"id":"ref-invalid-1","type":"expense","date":"2026-11-04",
             "title":"Incorrecto","amount":1250,"category":"otros",
             "sourceDocumentIds":["not-in-attachments"]}
          ],
          "attachments":[]
        }
        """
        XCTAssertThrowsError(try store.restoreBackup(Data(malformed.utf8)))
        XCTAssertEqual(store.data.transactions.count,initial)
    }
}
