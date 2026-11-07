import importlib.util
from pathlib import Path
from email import policy
from email.parser import BytesParser
import unittest

source=Path(__file__).with_name('yahoo-to-gmail.py')
spec=importlib.util.spec_from_file_location('mail_sync',source)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class CollectorTests(unittest.TestCase):
    def test_message_preserved_and_tagged(self):
        original=b'From: A <a@example.org>\r\nTo: B <b@yahoo.com>\r\nSubject: Hi\r\nMessage-ID: <fixture-1@example.org>\r\n\r\nHello world\r\n'
        tagged=mod.tagged_message(original,'f'*64)
        parsed=BytesParser(policy=policy.default).parsebytes(tagged)
        self.assertEqual(parsed.get('Message-ID'),'<fixture-1@example.org>')
        self.assertEqual(str(parsed.get(mod.HEADER)).strip(),'f'*64)
        self.assertEqual(parsed.get_content().strip(),'Hello world')
        with self.assertRaisesRegex(RuntimeError,'SOURCE_HAS_RESERVED_HEADER'):
            mod.tagged_message(tagged,'f'*64)
    def test_token_deterministic_and_scoped(self):
        a=mod.imported_token('TEST@YAHOO.COM','1',42)
        self.assertEqual(a,mod.imported_token('test@yahoo.com','1',42))
        self.assertNotEqual(a,mod.imported_token('test@yahoo.com','2',42))
        self.assertNotEqual(a,mod.imported_token('test@yahoo.com','1',43))
    def test_no_unconfigured_credentials(self):
        import argparse
        args=argparse.Namespace(limit=50,yahoo_user='test@yahoo.com',gmail_user='test@gmail.com',yahoo_password_file='',gmail_password_file='',state_file='/unused',include_existing=False)
        with self.assertRaisesRegex(RuntimeError,'CREDENTIAL_FILE_MISSING'):
            mod.run(args)

class MockImapTests(unittest.TestCase):
    def test_bootstrap_then_import_and_dedup(self):
        import argparse
        import tempfile
        import unittest.mock
        from pathlib import Path
        original=(b'From: A <a@example.org>\r\nTo: B <b@yahoo.com>\r\n'
                  b'Subject: Test\r\nMessage-ID: <fixture-two@example.org>\r\n\r\nThis is safe fixture mail.\r\n')
        class FakeImap:
            def __init__(self,source):
                self.source=source
                self.uids=[b'1']
                self.tags=set()
                self.appends=[]
            def select(self,folder,readonly=True): return ('OK',[b'1'])
            def response(self,name): return ('UIDVALIDITY',[b'250'])
            def uid(self,cmd,*args):
                if cmd=='SEARCH':
                    if self.source:return ('OK',[b' '.join(self.uids)])
                    return ('OK',[b'1'] if args[-1] in self.tags else [b''])
                if cmd=='FETCH':return ('OK',[(b'1 (BODY[] {42}',original)])
                raise AssertionError(cmd)
            def append(self,folder,flags,date,raw):
                self.appends.append(raw)
                msg=BytesParser(policy=policy.default).parsebytes(raw)
                self.tags.add(str(msg.get(mod.HEADER)).strip())
                return ('OK',[b'APPEND complete'])
            def logout(self):pass
        yahoo, gmail = FakeImap(True), FakeImap(False)
        with tempfile.TemporaryDirectory() as tmp:
            args=argparse.Namespace(limit=50,yahoo_user='test@yahoo.com',gmail_user='test@gmail.com',
                yahoo_password_file='/fake/yahoo',gmail_password_file='/fake/gmail',
                state_file=str(Path(tmp)/'state.db'),include_existing=False)
            def connect(host,user,pw):return yahoo if 'yahoo' in host else gmail
            with unittest.mock.patch.object(mod,'credentials',return_value='fixture-only'),\
                 unittest.mock.patch.object(mod,'imap_connect',side_effect=connect):
                first=mod.run(args)
                self.assertEqual(first['status'],'initialized')
                self.assertEqual(len(gmail.appends),0)
                yahoo.uids.append(b'2')
                second=mod.run(args)
                self.assertEqual(second['imported'],1)
                self.assertEqual(len(gmail.appends),1)
                self.assertEqual(mod.run(args)['imported'],0)
                self.assertEqual(len(gmail.appends),1)

if __name__ == "__main__":
    unittest.main()
