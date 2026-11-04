import XCTest
@testable import Budviva

final class FinanceModelTests: XCTestCase {
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
}
